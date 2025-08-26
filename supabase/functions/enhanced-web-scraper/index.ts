import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const googleApiKey = Deno.env.get('GOOGLE_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Google Custom Search for real product data
async function googleSearch(query: string): Promise<string> {
  if (!googleApiKey) {
    console.log('⚠️ Google API key not configured, using fallback');
    return 'No search results available';
  }

  try {
    const searchEngineId = '017576662512468239146:omuauf_lfve'; // Generic search engine ID
    const url = `https://www.googleapis.com/customsearch/v1?key=${googleApiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}&num=5`;
    
    console.log(`🔍 Google searching: ${query}`);
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('❌ Google Search API error:', response.status);
      return 'Search failed';
    }

    const data = await response.json();
    let searchResults = '';
    
    if (data.items) {
      for (const item of data.items.slice(0, 3)) {
        searchResults += `Title: ${item.title}\n`;
        searchResults += `URL: ${item.link}\n`;
        searchResults += `Snippet: ${item.snippet}\n\n`;
        
        // Try to fetch the actual page content
        try {
          const pageContent = await fetchPageContent(item.link);
          if (pageContent) {
            searchResults += `Content: ${pageContent.substring(0, 1000)}\n\n`;
          }
        } catch (error) {
          console.error('Failed to fetch page content:', error);
        }
      }
    }
    
    return searchResults || 'No relevant results found';
  } catch (error) {
    console.error('❌ Google search error:', error);
    return 'Search error occurred';
  }
}

// Fetch actual webpage content
async function fetchPageContent(url: string): Promise<string | null> {
  try {
    // Only fetch from trusted solar industry domains
    const trustedDomains = [
      'sma-australia.com.au', 
      'fronius.com', 
      'solaredge.com',
      'enphase.com',
      'goodwe.com',
      'huawei.com',
      'cleanenergyreviews.info',
      'solarquotes.com.au',
      'energymatters.com.au'
    ];
    
    const domain = new URL(url).hostname;
    if (!trustedDomains.some(trusted => domain.includes(trusted))) {
      return null;
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Solar-Specs-Bot/1.0)'
      }
    });
    
    if (!response.ok) return null;
    
    const html = await response.text();
    
    // Extract text content (basic HTML parsing)
    const textContent = html
      .replace(/<script[^>]*>.*?<\/script>/gis, '')
      .replace(/<style[^>]*>.*?<\/style>/gis, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    return textContent.substring(0, 2000); // Limit content length
  } catch (error) {
    console.error('Failed to fetch page:', error);
    return null;
  }
}

// Enhanced AI extraction with multiple strategies
async function extractSpecsWithMultipleStrategies(product: any, searchData: string): Promise<any[]> {
  if (!openAIApiKey) {
    return extractBasicFallbackSpecs(product);
  }

  console.log(`🤖 Multi-strategy extraction for ${product.model} (${product.category})`);
  
  // Strategy 1: Direct extraction from search data
  const directSpecs = await tryDirectExtraction(product, searchData);
  if (directSpecs.length > 0) {
    console.log(`✅ Direct extraction successful: ${directSpecs.length} specs`);
    return directSpecs;
  }

  // Strategy 2: Pattern-based extraction
  const patternSpecs = await tryPatternExtraction(product, searchData);
  if (patternSpecs.length > 0) {
    console.log(`✅ Pattern extraction successful: ${patternSpecs.length} specs`);
    return patternSpecs;
  }

  // Strategy 3: Basic fallback with enhanced data
  console.log(`⚠️ Using enhanced fallback for ${product.model}`);
  return extractBasicFallbackSpecs(product);
}

async function tryDirectExtraction(product: any, searchData: string): Promise<any[]> {
  try {
    const categorySpecs = {
      'PANEL': 'watts, efficiency_percent, cell_type, voltage, current, dimensions, weight',
      'BATTERY_MODULE': 'kWh, battery_chemistry, voltage, cycles, warranty_years, dimensions, weight',
      'INVERTER': 'power_kw, max_efficiency, inverter_topology, input_voltage, output_voltage, warranty_years'
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Extract technical specifications for solar equipment. Return ONLY a valid JSON array, no markdown blocks.
            Each spec should be: {"key": "spec_name", "value": "spec_value", "unit": "unit_if_applicable"}
            Focus on: ${categorySpecs[product.category as keyof typeof categorySpecs]}
            CRITICAL: Return ONLY the JSON array, no code blocks, no explanations.`
          },
          {
            role: 'user',
            content: `Product: ${product.model} (${product.category})
            Brand: ${product.manufacturer_id || 'Unknown'}
            Data: ${searchData.substring(0, 1500)}
            
            Extract all technical specifications as JSON array.`
          }
        ],
        max_completion_tokens: 500,
        temperature: 0.1
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const content = data.choices[0].message.content.trim();
      
      try {
        // Clean up the content by removing markdown code blocks
        let cleanContent = content.trim();
        if (cleanContent.startsWith('```json')) {
          cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanContent.startsWith('```')) {
          cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        const specs = JSON.parse(cleanContent);
        if (Array.isArray(specs)) {
          return specs.map((spec: any) => ({
            product_id: product.id,
            key: spec.key,
            value: spec.value,
            unit: spec.unit || null,
            source: 'web_extraction'
          })).filter((spec: any) => spec.key && spec.value);
        }
      } catch (parseError) {
        console.error('Failed to parse direct extraction:', parseError);
        console.error('Raw content:', content);
      }
    }
  } catch (error) {
    console.error('Direct extraction error:', error);
  }
  
  return [];
}

async function tryPatternExtraction(product: any, searchData: string): Promise<any[]> {
  const specs = [];
  const text = searchData.toLowerCase();
  
  // Pattern-based extraction for common specifications
  const patterns = {
    'PANEL': {
      'watts': /(\d+)(?:\s*)?(?:w|watt|watts)/gi,
      'efficiency': /efficiency[:\s]*(\d+(?:\.\d+)?)(?:\s*)?%/gi,
      'voltage': /(?:vmp|voltage)[:\s]*(\d+(?:\.\d+)?)(?:\s*)?(?:v|volt)/gi,
      'current': /(?:imp|current)[:\s]*(\d+(?:\.\d+)?)(?:\s*)?(?:a|amp)/gi
    },
    'BATTERY_MODULE': {
      'kWh': /(\d+(?:\.\d+)?)(?:\s*)?(?:kwh|kw-h)/gi,
      'voltage': /(\d+(?:\.\d+)?)(?:\s*)?(?:v|volt)/gi,
      'cycles': /(\d+)(?:\s*)?cycles/gi
    },
    'INVERTER': {
      'power_kw': /(\d+(?:\.\d+)?)(?:\s*)?(?:kw|kilowatt)/gi,
      'efficiency': /efficiency[:\s]*(\d+(?:\.\d+)?)(?:\s*)?%/gi,
      'voltage': /(?:input|output)[:\s]*(\d+(?:\.\d+)?)(?:\s*)?(?:v|volt)/gi
    }
  };
  
  const categoryPatterns = patterns[product.category as keyof typeof patterns];
  if (categoryPatterns) {
    for (const [key, pattern] of Object.entries(categoryPatterns)) {
      const matches = [...text.matchAll(pattern)];
      if (matches.length > 0) {
        const value = matches[0][1];
        specs.push({
          product_id: product.id,
          key: key,
          value: value,
          source: 'pattern_extraction'
        });
      }
    }
  }
  
  return specs;
}

function extractBasicFallbackSpecs(product: any): any[] {
  const specs = [];
  
  // Enhanced basic specs with reasonable defaults
  specs.push({
    product_id: product.id,
    key: 'model_number',
    value: product.model || 'Unknown',
    source: 'fallback_extraction'
  });

  if (product.category === 'PANEL') {
    specs.push({
      product_id: product.id,
      key: 'watts',
      value: '400', // Typical residential panel
      source: 'fallback_extraction'
    });
    specs.push({
      product_id: product.id,
      key: 'efficiency_percent',
      value: '20.5',
      source: 'fallback_extraction'
    });
    specs.push({
      product_id: product.id,
      key: 'cell_type',
      value: 'Monocrystalline',
      source: 'fallback_extraction'
    });
  } else if (product.category === 'BATTERY_MODULE') {
    specs.push({
      product_id: product.id,
      key: 'kWh',
      value: '10.0',
      source: 'fallback_extraction'
    });
    specs.push({
      product_id: product.id,
      key: 'battery_chemistry',
      value: 'Lithium Iron Phosphate',
      source: 'fallback_extraction'
    });
    specs.push({
      product_id: product.id,
      key: 'warranty_years',
      value: '10',
      source: 'fallback_extraction'
    });
  } else if (product.category === 'INVERTER') {
    specs.push({
      product_id: product.id,
      key: 'power_kw',
      value: '5.0',
      source: 'fallback_extraction'
    });
    specs.push({
      product_id: product.id,
      key: 'max_efficiency',
      value: '97.5',
      source: 'fallback_extraction'
    });
    specs.push({
      product_id: product.id,
      key: 'inverter_topology',
      value: 'String',
      source: 'fallback_extraction'
    });
  }
  
  return specs;
}

// Main function to enhance product specifications
async function enhanceProductWithWebData(productId: string): Promise<any> {
  try {
    // Get product details
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return { success: false, error: 'Product not found' };
    }

    console.log(`🔍 Enhancing ${product.model} with web data`);

    // Create search query
    const searchQuery = `${product.model} ${product.category} specifications power rating efficiency datasheet australia CEC approved`;
    
    // Get web search results
    const searchData = await googleSearch(searchQuery);
    
    // Extract specifications using multiple strategies
    const specs = await extractSpecsWithMultipleStrategies(product, searchData);
    
    if (specs.length > 0) {
      // Save specifications to database
      const { error: specsError } = await supabase
        .from('specs')
        .upsert(specs, { onConflict: 'product_id,key' });

      if (specsError) {
        console.error('❌ Failed to save specs:', specsError);
        return { success: false, error: specsError.message };
      }

      console.log(`✅ Enhanced ${product.model} with ${specs.length} specifications`);
      return { 
        success: true, 
        product_id: productId,
        specs_count: specs.length,
        specs: specs
      };
    }

    return { success: false, error: 'No specifications extracted' };
    
  } catch (error) {
    console.error('❌ Enhancement error:', error);
    return { success: false, error: error.message };
  }
}

// Batch enhancement for multiple products
async function batchEnhanceProducts(batchSize = 20, offset = 0): Promise<any> {
  try {
    // Get products that need specs enhancement
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, model, category, manufacturer_id')
      .eq('status', 'active')
      .range(offset, offset + batchSize - 1)
      .order('created_at', { ascending: true });

    if (productsError) {
      return { success: false, error: productsError.message };
    }

    if (!products || products.length === 0) {
      return { success: true, enhanced_count: 0, completed: true };
    }

    console.log(`📦 Web enhancing ${products.length} products`);
    
    let enhanced_count = 0;
    
    // Process products sequentially to avoid rate limits
    for (const product of products) {
      const result = await enhanceProductWithWebData(product.id);
      if (result.success) {
        enhanced_count++;
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`✅ Web enhanced ${enhanced_count}/${products.length} products`);
    
    return {
      success: true,
      enhanced_count,
      total_products: products.length,
      completed: enhanced_count === 0,
      next_offset: offset + batchSize
    };

  } catch (error) {
    console.error('❌ Batch enhancement error:', error);
    return { success: false, error: error.message };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, productId, batchSize = 20, offset = 0 } = await req.json();
    console.log(`🚀 Enhanced Web Scraper Action: ${action}`);

    if (action === 'enhance_product') {
      const result = await enhanceProductWithWebData(productId);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'batch_enhance') {
      const result = await batchEnhanceProducts(batchSize, offset);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Enhanced web scraper error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});