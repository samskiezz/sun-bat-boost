import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Reliable spec extraction with GPT-5
async function extractSpecsReliably(product: any): Promise<any[]> {
  if (!openAIApiKey) {
    console.log(`❌ No OpenAI API key for ${product.model}`);
    return [];
  }

  console.log(`🚀 GPT-5 extracting specs for ${product.model} (${product.category})`);
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          {
            role: 'system',
            content: `Extract EXACTLY 10-15 technical specifications from this product data. 

CRITICAL REQUIREMENTS:
- Extract ONLY factual specifications from the provided data
- Return as simple "key: value" pairs, one per line
- NO explanations, NO markdown, NO JSON formatting
- Each spec must be precise and technical

For ${product.category}s, focus on: ${
  product.category === 'PANEL' 
    ? 'power_watts, efficiency_percent, voltage_voc, current_isc, voltage_vmp, current_imp, dimensions, weight, cell_type, frame_material, connector_type, warranty_years, temperature_coefficient, cell_count, junction_box_rating'
    : product.category === 'BATTERY_MODULE' 
    ? 'capacity_kwh, usable_capacity_kwh, nominal_voltage, max_charge_current, max_discharge_current, chemistry, cycle_life, warranty_years, dimensions, weight, operating_temp_min, operating_temp_max, round_trip_efficiency, vpp_compatible, units'
    : 'power_rating_kw, max_efficiency_percent, input_voltage_range, output_voltage, frequency_hz, max_input_current, inverter_topology, protection_rating, dimensions, weight, operating_temp_range, warranty_years, thd_percent, mppt_channels, grid_type'
}`
          },
          {
            role: 'user',
            content: `Product: ${product.model}
Brand: ${product.manufacturer?.name || 'Unknown'}  
Category: ${product.category}

Raw Data: ${JSON.stringify(product.raw || {}).substring(0, 1500)}

Datasheet: ${product.datasheet_url || 'None'}

Extract 10-15 precise specifications:`
          }
        ],
        max_completion_tokens: 300
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ OpenAI API error for ${product.model}:`, response.status, errorText);
      return [];
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    
    if (!content) {
      console.error(`❌ No content from GPT-5 for ${product.model}`);
      return [];
    }

    // Parse the response into specs
    const specs = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.includes(':') && line.length > 5)
      .map(line => {
        const colonIndex = line.indexOf(':');
        const key = line.substring(0, colonIndex).trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
        const value = line.substring(colonIndex + 1).trim().replace(/^["'\s]+|["'\s]+$/g, '');
        
        return {
          product_id: product.id,
          key: key,
          value: value,
          source: 'gpt5_extracted'
        };
      })
      .filter(spec => 
        spec.key.length > 2 && 
        spec.value.length > 0 && 
        !['unknown', 'n/a', 'not specified', 'tbd'].includes(spec.value.toLowerCase())
      )
      .slice(0, 15);

    console.log(`✅ GPT-5 extracted ${specs.length} specs for ${product.model}`);
    return specs;

  } catch (error) {
    console.error(`❌ GPT-5 error for ${product.model}:`, error.message);
    return [];
  }
}

// Process products and GUARANTEE database saves
async function processProductsBatch(productIds: string[]): Promise<any> {
  console.log(`🎯 Processing batch of ${productIds.length} products`);
  
  // Get products with manufacturer info
  const { data: products, error: fetchError } = await supabase
    .from('products')
    .select('id, model, category, raw, datasheet_url, manufacturers(name)')
    .in('id', productIds);

  if (fetchError || !products) {
    console.error('❌ Failed to fetch products:', fetchError?.message);
    return { success: false, processed: 0, successful: 0, error: fetchError?.message };
  }

  let successful = 0;
  let processed = 0;
  const results = [];

  for (const product of products) {
    processed++;
    console.log(`📋 Processing ${processed}/${products.length}: ${product.model}`);

    try {
      // First check if product already has enough specs
      const { count: existingSpecs } = await supabase
        .from('specs')
        .select('*', { count: 'exact', head: true })
        .eq('product_id', product.id);

      if (existingSpecs >= 6) {
        console.log(`⏭️ ${product.model} already has ${existingSpecs} specs - skipping`);
        successful++;
        continue;
      }

      // Extract specs using GPT-5
      const specs = await extractSpecsReliably(product);
      
      if (specs.length === 0) {
        console.log(`⚠️ No specs extracted for ${product.model}`);
        results.push({ product: product.model, status: 'no_specs', specs_count: 0 });
        continue;
      }

      // CRITICAL: Delete existing specs first to avoid conflicts
      const { error: deleteError } = await supabase
        .from('specs')
        .delete()
        .eq('product_id', product.id);

      if (deleteError) {
        console.error(`❌ Failed to delete old specs for ${product.model}:`, deleteError.message);
      }

      // Insert new specs
      const { error: insertError } = await supabase
        .from('specs')
        .insert(specs);

      if (insertError) {
        console.error(`❌ Failed to save specs for ${product.model}:`, insertError.message);
        results.push({ product: product.model, status: 'save_failed', error: insertError.message });
        continue;
      }

      // Verify specs were saved
      const { count: savedSpecs } = await supabase
        .from('specs')
        .select('*', { count: 'exact', head: true })
        .eq('product_id', product.id);

      console.log(`✅ Saved ${savedSpecs} specs for ${product.model} (extracted ${specs.length})`);
      successful++;
      results.push({ product: product.model, status: 'success', specs_count: savedSpecs });

    } catch (error) {
      console.error(`❌ Error processing ${product.model}:`, error.message);
      results.push({ product: product.model, status: 'error', error: error.message });
    }

    // Small delay to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`🎉 Batch complete: ${successful}/${processed} successful`);
  return { success: true, processed, successful, results };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { productIds = [] } = body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'No product IDs provided' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`🚀 Reliable extraction starting for ${productIds.length} products`);
    
    const result = await processProductsBatch(productIds);
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Reliable extractor error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});