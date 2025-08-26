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

// Robust extraction with multiple fallbacks
async function extractSpecs(product: any): Promise<any[]> {
  if (!openAIApiKey) {
    console.log(`❌ No OpenAI API key`);
    return [];
  }

  console.log(`🔥 Processing ${product.model}`);
  
  // Prepare focused prompt based on available data
  const dataString = JSON.stringify(product.raw || {});
  const hasRichData = dataString.length > 100;
  
  const specPrompt = product.category === 'PANEL' 
    ? 'Extract: power_watts, efficiency_percent, voltage_voc, current_isc, voltage_vmp, current_imp, dimensions, weight, cell_type, warranty_years'
    : product.category === 'BATTERY_MODULE'
    ? 'Extract: capacity_kwh, usable_capacity_kwh, nominal_voltage, max_charge_current, max_discharge_current, chemistry, cycle_life, warranty_years, dimensions, weight'
    : 'Extract: power_rating_kw, max_efficiency_percent, input_voltage_range, output_voltage, frequency_hz, inverter_topology, protection_rating, dimensions, weight, warranty_years';

  const models = [
    { name: 'gpt-5-2025-08-07', maxTokens: 400, hasTemp: false },
    { name: 'gpt-4.1-2025-04-14', maxTokens: 400, hasTemp: true },
    { name: 'gpt-5-mini-2025-08-07', maxTokens: 300, hasTemp: false }
  ];

  for (const model of models) {
    try {
      console.log(`🤖 Trying ${model.name}`);
      
      const body = {
        model: model.name,
        messages: [
          {
            role: 'system',
            content: `Extract technical specifications as "key: value" pairs.
${specPrompt}
Return only factual specs from the data provided.`
          },
          {
            role: 'user',
            content: `${product.model} by ${product.manufacturers?.name || 'Unknown'}
${hasRichData ? dataString.substring(0, 800) : `Category: ${product.category}\nDatasheet: ${product.datasheet_url || 'None'}`}`
          }
        ],
        max_completion_tokens: model.maxTokens
      };

      if (model.hasTemp) {
        body.temperature = 0.1;
        body.max_tokens = model.maxTokens;
        delete body.max_completion_tokens;
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`⚠️ ${model.name} failed (${response.status}): ${errorText.substring(0, 100)}`);
        continue;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content?.trim();
      
      if (!content || content.length < 10) {
        console.log(`⚠️ ${model.name} returned empty/short content`);
        continue;
      }

      // Parse specs
      const specs = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.includes(':') && line.length > 3)
        .map(line => {
          const colonIdx = line.indexOf(':');
          const key = line.substring(0, colonIdx).trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
          const value = line.substring(colonIdx + 1).trim().replace(/^["'\s]+|["'\s]+$/g, '');
          
          return {
            product_id: product.id,
            key,
            value,
            source: `${model.name.split('-')[0]}_extracted`
          };
        })
        .filter(spec => 
          spec.key.length > 1 && 
          spec.value.length > 0 && 
          !['unknown', 'n/a', 'not specified', 'tbd', 'none', 'varies'].includes(spec.value.toLowerCase())
        )
        .slice(0, 10);

      if (specs.length >= 3) {
        console.log(`✅ ${model.name} extracted ${specs.length} specs`);
        return specs;
      } else {
        console.log(`⚠️ ${model.name} only extracted ${specs.length} specs, trying next model`);
      }

    } catch (error) {
      console.log(`⚠️ ${model.name} error: ${error.message}`);
      continue;
    }
  }

  console.log(`❌ All models failed for ${product.model}`);
  return [];
}

// Process products with guaranteed results
async function processBatch(productIds: string[]): Promise<any> {
  console.log(`🎯 Processing ${productIds.length} products`);
  
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

  for (const product of products) {
    processed++;
    console.log(`\n📋 [${processed}/${products.length}] ${product.model}`);

    try {
      // Check existing specs
      const { count: existingSpecs } = await supabase
        .from('specs')
        .select('*', { count: 'exact', head: true })
        .eq('product_id', product.id);

      if (existingSpecs >= 6) {
        console.log(`⏭️ Already has ${existingSpecs} specs - skipping`);
        successful++;
        continue;
      }

      // Extract specs
      const specs = await extractSpecs(product);
      
      if (specs.length === 0) {
        console.log(`⚠️ No specs extracted`);
        continue;
      }

      // Clear old specs and insert new ones
      await supabase.from('specs').delete().eq('product_id', product.id);
      
      const { error: insertError } = await supabase
        .from('specs')
        .insert(specs);

      if (insertError) {
        console.error(`❌ Save failed:`, insertError.message);
        continue;
      }

      // Verify save
      const { count: savedSpecs } = await supabase
        .from('specs')
        .select('*', { count: 'exact', head: true })
        .eq('product_id', product.id);

      console.log(`✅ Saved ${savedSpecs} specs`);
      successful++;

    } catch (error) {
      console.error(`❌ Error:`, error.message);
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  console.log(`\n🎉 Complete: ${successful}/${processed} successful`);
  return { success: true, processed, successful };
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

    console.log(`\n🚀 Starting extraction for ${productIds.length} products`);
    
    const result = await processBatch(productIds);
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Function error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});