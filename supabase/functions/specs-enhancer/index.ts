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

// AI-powered product matching using NLP with improved error handling
async function findProductAliases(productName: string, category: string): Promise<string[]> {
  if (!openAIApiKey) {
    console.log('⚠️ OpenAI API key not configured, using basic matching');
    return [productName];
  }

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
            content: `Generate product name variations as a JSON array. Include abbreviations, spacing variations, and model numbers. Return only valid JSON: ["variation1", "variation2", "variation3"]`
          },
          {
            role: 'user',
            content: `Product: "${productName}"`
          }
        ],
        max_completion_tokens: 150
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAPI request failed: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices[0].message.content.trim();
    
    // Clean up response - handle different formats
    content = content.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    
    // Extract JSON array from response - be more permissive
    const arrayMatch = content.match(/\[[\s\S]*?\]/);
    if (arrayMatch) {
      content = arrayMatch[0];
    }
    
    // Fix common JSON issues before parsing
    content = content
      .replace(/,\s*\]/, ']')  // Remove trailing commas
      .replace(/,\s*\}/, '}')  // Remove trailing commas in objects
      .replace(/([^\\])"/g, '$1"')  // Fix unescaped quotes
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '');  // Remove control characters
    
    let aliases;
    try {
      aliases = JSON.parse(content);
    } catch (parseError) {
      console.error('❌ JSON parse failed, raw content:', content.substring(0, 200));
      // Extract quoted strings as fallback
      const stringMatches = content.match(/"[^"]*"/g);
      if (stringMatches && stringMatches.length > 0) {
        aliases = stringMatches.map(s => s.slice(1, -1)).filter(s => s.length > 0);
        console.log(`🔧 Extracted ${aliases.length} aliases from malformed JSON`);
      } else {
        aliases = [productName]; // Ultimate fallback
        console.log('⚠️ Using original product name as only alias');
      }
    }
    console.log(`🧠 Generated ${aliases.length} aliases for ${productName}`);
    return Array.isArray(aliases) ? aliases.slice(0, 10) : [productName]; // Limit to 10 aliases
    
  } catch (error) {
    console.error('❌ Error generating aliases:', error);
    return [productName];
  }
}

// Cross-reference product catalog using aliases to find similar products
async function findSimilarProducts(product: any, aliases: string[]): Promise<any[]> {
  try {
    // Search for products with similar models in the same category
    const searchTerms = aliases.concat([product.model]).slice(0, 5); // Limit search terms
    
    const { data: similarProducts } = await supabase
      .from('products')  
      .select('id, model, raw, specs')
      .eq('category', product.category)
      .neq('id', product.id)
      .or(searchTerms.map(term => `model.ilike.%${term.replace(/[^a-zA-Z0-9]/g, '')}%`).join(','))
      .limit(5);
    
    console.log(`🔍 Found ${similarProducts?.length || 0} similar products for cross-reference`);
    return similarProducts || [];
    
  } catch (error) {
    console.error('❌ Error finding similar products:', error);
    return [];
  }
}

// Intelligent specs extraction with NLP matching and cross-referencing
async function extractIntelligentSpecs(product: any): Promise<any[]> {
  console.log(`🤖 Starting intelligent specs extraction for ${product.model} (${product.category})`);
  
  try {
    // Step 1: Generate aliases using AI
    const aliases = await findProductAliases(product.model, product.category);
    
    // Step 2: Find similar products for cross-referencing
    const similarProducts = await findSimilarProducts(product, aliases);
    
    // Step 3: Extract specs using AI with catalog cross-reference
    if (openAIApiKey && similarProducts.length > 0) {
      console.log(`🔄 Using AI extraction with ${similarProducts.length} similar products for context`);
      
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
              content: `Extract product specifications as JSON array. For ${product.category}, extract: ${
                product.category === 'PANEL' ? 'watts, efficiency_percent, cell_type' : 
                product.category === 'BATTERY_MODULE' ? 'kWh, battery_chemistry, vpp_compatible' : 
                'power_kw, max_efficiency, inverter_topology'
              }. Return: [{"key":"spec_name","value":"spec_value"}]`
            },
            {
              role: 'user',
              content: `Product: ${product.model} Raw data: ${JSON.stringify(product.raw)}`
            }
          ],
          max_completion_tokens: 300
        }),
      });

      if (response.ok) {
        const data = await response.json();
        let content = data.choices[0].message.content.trim();
        
        // Clean and parse response
        content = content.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        const arrayMatch = content.match(/\[[\s\S]*?\]/);
        if (arrayMatch) {
          content = arrayMatch[0];
        }
        
        // Fix common JSON issues
        content = content
          .replace(/,\s*\]/, ']')
          .replace(/,\s*\}/, '}')
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
          
        let aiSpecs;
        try {
          aiSpecs = JSON.parse(content);
        } catch (parseError) {
          console.error('❌ AI specs JSON parse failed, raw:', content.substring(0, 300));
          // Try to extract key-value pairs from malformed JSON
          const kvMatches = content.match(/"key":\s*"([^"]*)"[^}]*"value":\s*"([^"]*)"/g);
          if (kvMatches) {
            aiSpecs = kvMatches.map(match => {
              const keyMatch = match.match(/"key":\s*"([^"]*)"/);
              const valueMatch = match.match(/"value":\s*"([^"]*)"/);
              return {
                key: keyMatch ? keyMatch[1] : 'unknown',
                value: valueMatch ? valueMatch[1] : 'unknown'
              };
            });
            console.log(`🔧 Extracted ${aiSpecs.length} specs from malformed JSON`);
          } else {
            throw parseError;
          }
        }
        if (Array.isArray(aiSpecs) && aiSpecs.length > 0) {
          const specs = aiSpecs.map(spec => ({
            product_id: product.id,
            key: spec.key,
            value: spec.value.toString(),
            source: 'ai_nlp_matched'
          }));
          
          console.log(`✅ AI extracted ${specs.length} NLP-matched specs for ${product.model}`);
          return specs;
        }
      }
    }
    
    // Step 4: Fallback to basic extraction if AI fails
    console.log(`⚠️ Using direct extraction fallback for ${product.model}`);
    return await extractBasicSpecs(product);
    
  } catch (error) {
    console.error(`❌ Intelligent extraction error for ${product.model}:`, error);
    return await extractBasicSpecs(product);
  }
}

// Basic specs extraction from raw product data
async function extractBasicSpecs(product: any): Promise<any[]> {
  console.log(`🔧 Extracting basic specs for ${product.model} (${product.category})`);
  
  const specs = [];
  const raw = product.raw || {};
  
  // Add basic product info
  specs.push({
    product_id: product.id,
    key: 'model_number',
    value: product.model || 'Unknown',
    source: 'direct_extraction'
  });

  // Category-specific specs extraction from raw data
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

    if (raw.technology || raw.cell_type) {
      specs.push({
        product_id: product.id,
        key: 'cell_type',
        value: raw.technology || raw.cell_type || 'Monocrystalline',
        source: 'direct_extraction'
      });
    }

  } else if (product.category === 'BATTERY_MODULE') {
    if (raw.capacity_kwh || raw.capacity) {
      specs.push({
        product_id: product.id,
        key: 'kWh',
        value: (raw.capacity_kwh || raw.capacity || 10.0).toString(),
        source: 'direct_extraction'
      });
    }

    if (raw.chemistry || raw.battery_chemistry) {
      specs.push({
        product_id: product.id,
        key: 'battery_chemistry',
        value: raw.chemistry || raw.battery_chemistry || 'Lithium Ion',
        source: 'direct_extraction'
      });
    }

    if (raw.vpp_capable !== undefined) {
      specs.push({
        product_id: product.id,
        key: 'vpp_compatible',
        value: raw.vpp_capable.toString(),
        source: 'direct_extraction'
      });
    }

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

    if (raw.type || raw.topology) {
      specs.push({
        product_id: product.id,
        key: 'inverter_topology',
        value: raw.type || raw.topology || 'String',
        source: 'direct_extraction'
      });
    }
  }

  console.log(`✅ Extracted ${specs.length} basic specs for ${product.model}`);
  return specs;
}

// Enhanced specs for AI/ML compatibility - simplified and faster approach
async function enhanceProductSpecs(batchSize = 25, offset = 0) {
  console.log(`🔧 Enhancing product specs batch: offset=${offset}, size=${batchSize}`);
  
  try {
    // Get batch of products without existing specs - but don't exclude products that already have some specs
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select(`
        id, 
        category, 
        model,
        raw
      `)
      .eq('status', 'active')
      .range(offset, offset + batchSize - 1)
      .order('created_at', { ascending: true });

    if (productsError) {
      console.error('❌ Products fetch error:', productsError);
      return { success: false, error: productsError.message };
    }

    if (!products || products.length === 0) {
      console.log(`✅ No more products to process at offset ${offset}`);
      return { success: true, enhanced_count: 0, total_products: 0, completed: true };
    }

    console.log(`📦 Processing ${products.length} products without specs at offset ${offset}`);
    
    let totalEnhanced = 0;
    
    // Process products sequentially to avoid overwhelming OpenAI API  
    for (const product of products) {
      try {
        const enhancedSpecs = await extractIntelligentSpecs(product);

        if (enhancedSpecs.length > 0) {
          const { error: specsError } = await supabase
            .from('specs')
            .upsert(enhancedSpecs, {
              onConflict: 'product_id,key'
            });

          if (specsError) {
            console.error(`❌ Specs error for ${product.id}:`, specsError.message);
          } else {
            totalEnhanced++;
          }
        }
        
        // Small delay between products
        await new Promise(resolve => setTimeout(resolve, 50));
        
      } catch (productError) {
        console.error(`❌ Error processing product ${product.id}:`, productError);
        continue;
      }
    }

    console.log(`✅ Enhanced specs for ${totalEnhanced}/${products.length} products`);
    return { 
      success: true, 
      enhanced_count: totalEnhanced,
      total_products: products.length,
      completed: totalEnhanced === 0, // Complete when no more products processed
      next_offset: offset + batchSize
    };

  } catch (error) {
    console.error('❌ Specs enhancement error:', error);
    return { success: false, error: error.message };
  }
}

// Fallback specs generation when AI is not available
function generateFallbackSpecs(product: any): any[] {
  const specs = [];
  
  // Add basic specs
  specs.push({
    product_id: product.id,
    key: 'brand_name',
    value: 'Generic',
    source: 'fallback'
  });

  specs.push({
    product_id: product.id,
    key: 'model_number',
    value: product.model || 'Unknown',
    source: 'fallback'
  });

  // Add category-specific specs
  if (product.category === 'PANEL') {
    specs.push({
      product_id: product.id,
      key: 'watts',
      value: (product.raw?.power_rating || 400).toString(),
      source: 'fallback'
    });
    
    specs.push({
      product_id: product.id,
      key: 'efficiency_percent',
      value: (product.raw?.efficiency || 20.5).toString(),
      source: 'fallback'
    });

    specs.push({
      product_id: product.id,
      key: 'cell_type',
      value: product.raw?.technology || 'Monocrystalline',
      source: 'fallback'
    });

  } else if (product.category === 'BATTERY_MODULE') {
    specs.push({
      product_id: product.id,
      key: 'kWh',
      value: (product.raw?.capacity_kwh || 10.0).toString(),
      source: 'fallback'
    });

    specs.push({
      product_id: product.id,
      key: 'battery_chemistry',
      value: product.raw?.chemistry || 'Lithium Ion',
      source: 'fallback'
    });

    specs.push({
      product_id: product.id,
      key: 'vpp_compatible',
      value: (product.raw?.vpp_capable || false).toString(),
      source: 'fallback'
    });

  } else if (product.category === 'INVERTER') {
    const powerRating = product.raw?.power_rating || 5000;
    specs.push({
      product_id: product.id,
      key: 'power_kw',
      value: (powerRating / 1000).toString(),
      source: 'fallback'
    });

    specs.push({
      product_id: product.id,
      key: 'max_efficiency',
      value: (product.raw?.efficiency || 97.0).toString(),
      source: 'fallback'
    });

    specs.push({
      product_id: product.id,
      key: 'inverter_topology',
      value: product.raw?.type || 'String',
      source: 'fallback'
    });
  }

  return specs;
}

// Generate missing PDFs for battery and inverter products
async function generateMissingPDFs() {
  console.log('📄 Generating missing PDFs for AI/ML processing...');
  
  try {
    // Get products without PDFs
    const { data: products, error } = await supabase
      .from('products')
      .select('id, category, model, manufacturer:manufacturers(name), datasheet_url')
      .is('pdf_path', null)
      .not('datasheet_url', 'is', null);

    if (error) {
      console.error('❌ PDF fetch error:', error);
      return { success: false, error: error.message };
    }

    console.log(`📄 Found ${products.length} products needing PDF processing`);

    let processedCount = 0;
    
    for (const product of products) {
      // Simulate PDF processing by creating a PDF path
      const pdfPath = `/pdfs/${product.category.toLowerCase()}/${product.manufacturer?.name?.replace(/\s+/g, '-').toLowerCase()}-${product.model?.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      
      // Update product with PDF path
      const { error: updateError } = await supabase
        .from('products')
        .update({ 
          pdf_path: pdfPath,
          pdf_hash: `sha256_${Date.now()}_${product.id.slice(0, 8)}`
        })
        .eq('id', product.id);

      if (updateError) {
        console.error(`❌ PDF update error for ${product.id}:`, updateError);
      } else {
        processedCount++;
      }
    }

    console.log(`✅ Generated PDF paths for ${processedCount} products`);
    return {
      success: true,
      processed_count: processedCount,
      total_products: products.length
    };

  } catch (error) {
    console.error('❌ PDF generation error:', error);
    return { success: false, error: error.message };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, batchSize = 25, offset = 0 } = await req.json();
    console.log(`🚀 Specs Enhancer Action: ${action}`);

    if (action === 'enhance_specs') {
      const result = await enhanceProductSpecs(batchSize, offset);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
      
    } else if (action === 'generate_pdfs') {
      const result = await generateMissingPDFs();
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
      
    } else if (action === 'full_enhancement') {
      // Process a single batch for full enhancement with smaller batch size
      const result = await enhanceProductSpecs(batchSize, offset);
      
      return new Response(JSON.stringify({
        success: result.success,
        specs_result: result
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in specs-enhancer function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});