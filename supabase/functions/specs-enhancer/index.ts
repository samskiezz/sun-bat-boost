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

// Enhanced AI extraction with web scraping fallback
async function extractSpecsWithAI(product: any): Promise<any[]> {
  if (!openAIApiKey) {
    console.log('⚠️ OpenAI API key not configured, using web fallback');
    return await extractWithWebFallback(product);
  }

  console.log(`🤖 AI extracting specs for ${product.model} (${product.category})`);
  
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
            content: `You are a technical specification expert. Extract COMPREHENSIVE product specifications from the provided data.

REQUIREMENTS: Extract at least 8-12 detailed specifications. Be thorough and precise.

For ${product.category}, extract ALL available specs including: ${
  product.category === 'PANEL' ? 'watts, efficiency_percent, cell_type, voltage_open_circuit, current_short_circuit, voltage_max_power, current_max_power, dimensions, weight, temperature_coefficient, warranty_years, frame_material, connector_type, cell_count' : 
  product.category === 'BATTERY_MODULE' ? 'capacity_kwh, usable_capacity, battery_chemistry, nominal_voltage, max_charge_current, max_discharge_current, cycle_life, warranty_years, dimensions, weight, operating_temperature, vpp_compatible, round_trip_efficiency' : 
  'power_kw, max_efficiency, input_voltage_range, max_input_current, output_voltage, frequency, inverter_topology, protection_class, dimensions, weight, operating_temperature, warranty_years, thd_rating'
}

CRITICAL: Extract EVERY specification you can find. Return specifications as simple lines: "key: value". NO JSON, NO markdown blocks. Be comprehensive - aim for 10+ specs per product.`
          },
          {
            role: 'user',  
            content: `Model: ${product.model}\nBrand: ${product.manufacturer?.name || 'Unknown'}\nCategory: ${product.category}\n\nRaw Data: ${JSON.stringify(product.raw).substring(0, 1200)}\n\nDatasheet URL: ${product.datasheet_url || 'None'}\n\nExtract ALL specifications comprehensively.`
          }
        ],
        max_completion_tokens: 400 // GPT-5 doesn't support temperature parameter
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const content = data.choices[0].message.content.trim();
      
      // Parse line-by-line format and convert to JSON structure
      const specs = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.includes(':') && line.length > 3)
        .map(line => {
          const colonIndex = line.indexOf(':');
          const key = line.substring(0, colonIndex).trim().toLowerCase().replace(/\s+/g, '_');
          const value = line.substring(colonIndex + 1).trim().replace(/^["'\s]+|["'\s]+$/g, '');
          return {
            product_id: product.id,
            key: key,
            value: value,
            source: 'ai_extracted'
          };
        })
        .filter(spec => spec.key.length > 0 && spec.value.length > 0 && spec.value !== 'unknown')
        .slice(0, 15); // Increased from 8 to 15 specs
      
      if (specs.length >= 6) { // Require at least 6 comprehensive specs
        console.log(`✅ AI extracted ${specs.length} specs for ${product.model}`);
        return specs;
      } else {
        console.log(`⚠️ AI extracted only ${specs.length} specs, trying web fallback`);
        return await extractWithWebFallback(product);
      }
    }
  } catch (error) {
    console.error(`❌ AI extraction error for ${product.model}:`, error);
  }
  
  // Fallback to web extraction
  return await extractWithWebFallback(product);
}

// Web scraping fallback when AI fails
async function extractWithWebFallback(product: any): Promise<any[]> {
  console.log(`🌐 Web fallback for ${product.model}`);
  
  try {
    // Call the enhanced web scraper
    const response = await supabase.functions.invoke('enhanced-web-scraper', {
      body: { action: 'enhance_product', productId: product.id }
    });

    if (response.data?.success && response.data.specs?.length > 0) {
      console.log(`✅ Web fallback extracted ${response.data.specs.length} specs for ${product.model}`);
      return response.data.specs;
    }
  } catch (error) {
    console.error(`❌ Web fallback error for ${product.model}:`, error);
  }
  
  // Final fallback to basic extraction
  return await extractBasicSpecs(product);
}

// Basic specs extraction from raw product data
async function extractBasicSpecs(product: any): Promise<any[]> {
  console.log(`🔧 Basic extraction for ${product.model} (${product.category})`);
  
  const specs = [];
  const raw = product.raw || {};
  
  // Add model number
  specs.push({
    product_id: product.id,
    key: 'model_number',
    value: product.model || 'Unknown',
    source: 'direct_extraction'
  });

  // Category-specific specs
  if (product.category === 'PANEL') {
    if (raw.power_rating || raw.watts) {
      specs.push({
        product_id: product.id,
        key: 'watts',
        value: (raw.power_rating || raw.watts || 400).toString(),
        source: 'direct_extraction'
      });
    }
    
    if (raw.efficiency) {
      specs.push({
        product_id: product.id,
        key: 'efficiency_percent',
        value: raw.efficiency.toString(),
        source: 'direct_extraction'
      });
    }

    specs.push({
      product_id: product.id,
      key: 'cell_type',
      value: raw.technology || raw.cell_type || 'Monocrystalline',
      source: 'direct_extraction'
    });

  } else if (product.category === 'BATTERY_MODULE') {
    if (raw.capacity_kwh || raw.capacity) {
      specs.push({
        product_id: product.id,
        key: 'kWh',
        value: (raw.capacity_kwh || raw.capacity || 10.0).toString(),
        source: 'direct_extraction'
      });
    }

    specs.push({
      product_id: product.id,
      key: 'battery_chemistry',
      value: raw.chemistry || raw.battery_chemistry || 'Lithium Ion',
      source: 'direct_extraction'
    });

    specs.push({
      product_id: product.id,
      key: 'vpp_compatible',
      value: (raw.vpp_capable || false).toString(),
      source: 'direct_extraction'
    });

  } else if (product.category === 'INVERTER') {
    if (raw.power_rating) {
      specs.push({
        product_id: product.id,
        key: 'power_kw',
        value: (raw.power_rating / 1000).toString(),
        source: 'direct_extraction'
      });
    }

    if (raw.efficiency) {
      specs.push({
        product_id: product.id,
        key: 'max_efficiency',
        value: raw.efficiency.toString(),
        source: 'direct_extraction'
      });
    }

    specs.push({
      product_id: product.id,
      key: 'inverter_topology',
      value: raw.inverter_type || raw.type || raw.topology || 'String',
      source: 'direct_extraction'
    });
  }

  console.log(`✅ Extracted ${specs.length} basic specs for ${product.model}`);
  return specs;
}

// Enhanced specs for AI/ML compatibility - much faster parallel processing
async function enhanceProductSpecs(batchSize = 100, offset = 0) {
  console.log(`🚀 Fast specs enhancement: offset=${offset}, size=${batchSize}`);
  
  try {
    // Get products that don't have specs yet
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, category, model, raw')
      .eq('status', 'active')
      .range(offset, offset + batchSize - 1)
      .order('created_at', { ascending: true });

    if (productsError) {
      console.error('❌ Products fetch error:', productsError);
      return { success: false, error: productsError.message };
    }

    if (!products || products.length === 0) {
      console.log(`✅ No more products at offset ${offset}`);
      return { success: true, enhanced_count: 0, total_products: 0, completed: true };
    }

    console.log(`📦 Processing ${products.length} products in parallel`);
    
    let totalEnhanced = 0;
    
    // Process products in smaller batches to avoid timeout
    const MINI_BATCH_SIZE = 20;  // Increased from 10
    for (let i = 0; i < products.length; i += MINI_BATCH_SIZE) {
      const batch = products.slice(i, i + MINI_BATCH_SIZE);
      
      const batchPromises = batch.map(async (product) => {
        try {
          // Check if product already has specs
          const { count: specCount } = await supabase
            .from('specs')
            .select('*', { count: 'exact', head: true })
            .eq('product_id', product.id);
          
          // Skip products that already have comprehensive specs (6+) to avoid unnecessary work
          if (specCount >= 6) {
            console.log(`⏭️ Skipping ${product.model} - already has ${specCount} specs`);
            return false;
          }

          const specs = await extractSpecsWithAI(product);
          
          if (specs.length > 0) {
            const { error: specsError } = await supabase
              .from('specs')
              .upsert(specs, { onConflict: 'product_id,key' });

            if (specsError) {
              console.error(`❌ Specs error for ${product.model}:`, specsError.message);
              return false;
            }
            
            // Product processed successfully
            console.log(`✅ Successfully processed ${product.model}`);
              
            console.log(`✅ Enhanced ${product.model} with ${specs.length} specs`);
            return true;
          }
          return false;
        } catch (error) {
          console.error(`❌ Error processing ${product.model}:`, error);
          return false;
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      totalEnhanced += batchResults.filter(r => r).length;
      
      // Small delay between mini-batches
      if (i + MINI_BATCH_SIZE < products.length) {
        await new Promise(resolve => setTimeout(resolve, 200));  // Reduced delay
      }
    }
    
    console.log(`✅ Enhanced ${totalEnhanced}/${products.length} products in batch`);
    
    const hasMore = products.length === batchSize;
    return { 
      success: true, 
      enhanced_count: totalEnhanced,
      total_products: products.length,
      completed: !hasMore || totalEnhanced === 0,
      next_offset: hasMore ? offset + batchSize : null
    };

  } catch (error) {
    console.error('❌ Enhancement error:', error);
    return { success: false, error: error.message };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json().catch(() => ({}));
    const { action = 'enhance_specs', batchSize = 100, offset = 0, productId, productIds } = body;

    console.log(`🚀 Specs Enhancer Action: ${action}, batch: ${batchSize}, offset: ${offset}`);

    let result;
    if (action === 'enhance_product' && productId) {
      // Process single product
      console.log(`🎯 Enhancing single product: ${productId}`);
      const { data: product } = await supabase
        .from('products')
        .select('*, manufacturers(name)')
        .eq('id', productId)
        .single();
        
      if (!product) {
        return new Response(JSON.stringify({ success: false, error: 'Product not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      const specs = await extractSpecsWithAI(product);
      result = { success: true, specsAdded: specs.length };
    } else if (action === 'enhance_list' && productIds) {
      // Process list of product IDs
      console.log(`📋 Enhancing product list: ${productIds.length} products`);
      const { data: products } = await supabase
        .from('products')
        .select('*, manufacturers(name)')
        .in('id', productIds);
        
      if (!products || products.length === 0) {
        return new Response(JSON.stringify({ success: false, processed: 0, successful: 0, failures: 0 }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      let successful = 0;
      let failures = 0;
      
      // Process products in parallel batches of 10
      const chunkSize = 10;
      for (let i = 0; i < products.length; i += chunkSize) {
        const chunk = products.slice(i, i + chunkSize);
        const promises = chunk.map(async (product) => {
          try {
            const specs = await extractSpecsWithAI(product);
            if (specs.length > 0) {
              // CRITICAL FIX: Actually save the specs to database!
              const { error: specsError } = await supabase
                .from('specs')
                .upsert(specs, { onConflict: 'product_id,key' });

              if (specsError) {
                console.error(`❌ Specs save error for ${product.model}:`, specsError.message);
                failures++;
                return { success: false, error: specsError.message };
              }
              
              successful++;
              console.log(`✅ Saved ${specs.length} specs for ${product.model}`);
              return { success: true, specsAdded: specs.length };
            } else {
              failures++;
              return { success: false, error: 'No specs extracted' };
            }
          } catch (error) {
            failures++;
            console.error(`❌ Failed to enhance product ${product.id}:`, error);
            return { success: false, error: error.message };
          }
        });
        
        await Promise.all(promises);
        console.log(`📊 Progress: ${Math.min(i + chunkSize, products.length)}/${products.length} processed`);
      }
      
      result = { success: true, processed: products.length, successful, failures };
    } else if (action === 'full_enhancement') {
      console.log('🚀 Full specs enhancement starting...');
      result = await enhanceProductSpecs();
    } else {
      console.log(`🚀 Fast specs enhancement: offset=${offset}, size=${batchSize}`);
      result = await enhanceProductSpecs(batchSize, offset);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('❌ Error in specs-enhancer:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});