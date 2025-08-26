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

// Simple line-based AI extraction - no JSON parsing issues
async function extractSpecsWithAI(product: any): Promise<any[]> {
  if (!openAIApiKey) {
    console.log('⚠️ OpenAI API key not configured, using basic extraction');
    return await extractBasicSpecs(product);
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
        model: 'gpt-5-nano-2025-08-07',
        messages: [
          {
            role: 'system',
            content: `Extract product specifications. List each spec on a new line as "key: value". 
For ${product.category}, focus on: ${
  product.category === 'PANEL' ? 'watts, efficiency_percent, cell_type' : 
  product.category === 'BATTERY_MODULE' ? 'kWh, battery_chemistry, vpp_compatible' : 
  'power_kw, max_efficiency, inverter_topology'
}. NO JSON, just lines.`
          },
          {
            role: 'user',  
            content: `Model: ${product.model}\nData: ${JSON.stringify(product.raw).substring(0, 800)}`
          }
        ],
        max_completion_tokens: 200
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const content = data.choices[0].message.content.trim();
      
      // Parse line-by-line format - much more reliable than JSON
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
        .slice(0, 8);
      
      if (specs.length > 0) {
        console.log(`✅ AI extracted ${specs.length} specs for ${product.model}`);
        return specs;
      }
    }
  } catch (error) {
    console.error(`❌ AI extraction error for ${product.model}:`, error);
  }
  
  // Always fallback to basic extraction
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
    
    // Process all products in parallel - much faster
    const allPromises = products.map(async (product) => {
      try {
        const specs = await extractSpecsWithAI(product);
        
        if (specs.length > 0) {
          const { error: specsError } = await supabase
            .from('specs')
            .upsert(specs, { onConflict: 'product_id,key' });

          if (specsError) {
            console.error(`❌ Specs error for ${product.id}:`, specsError.message);
            return false;
          }
          return true;
        }
        return false;
      } catch (error) {
        console.error(`❌ Error processing ${product.id}:`, error);
        return false;
      }
    });
    
    const results = await Promise.all(allPromises);
    const totalEnhanced = results.filter(r => r).length;
    
    console.log(`✅ Enhanced ${totalEnhanced}/${products.length} products`);
    return { 
      success: true, 
      enhanced_count: totalEnhanced,
      total_products: products.length,
      completed: totalEnhanced === 0,
      next_offset: offset + batchSize
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
    const { action, batchSize = 100, offset = 0 } = await req.json();
    console.log(`🚀 Specs Enhancer Action: ${action}, batch: ${batchSize}, offset: ${offset}`);

    if (action === 'enhance_specs' || action === 'full_enhancement') {
      const result = await enhanceProductSpecs(batchSize, offset);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in specs-enhancer:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});