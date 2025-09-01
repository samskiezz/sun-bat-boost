import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmbeddingRequest {
  sources: string[];
}

interface EmbeddingSet {
  source: string;
  items: number[][];
  labels?: string[];
}

function mulberry32(a: number) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

async function generateRealEmbeddings(supabase: any, source: string): Promise<{ embeddings: number[][], isReal: boolean }> {
  console.log(`🔍 Generating real embeddings for source: ${source}`);
  
  try {
    let data: any[] = [];
    let tableName = '';
    
    // Query different tables based on source name
    switch (source.toLowerCase()) {
      case 'products':
      case 'solar_panels':
      case 'batteries':
        tableName = 'products';
        const { data: products, error: productsError } = await supabase
          .from('products')
          .select('id, model, category, specs, created_at')
          .limit(100);
        if (productsError) throw productsError;
        data = products || [];
        break;
        
      case 'energy_plans':
      case 'tariffs':
        tableName = 'energy_plans';
        const { data: plans, error: plansError } = await supabase
          .from('energy_plans')
          .select('id, plan_name, retailer, network, state, fit_c_per_kwh, supply_c_per_day, usage_c_per_kwh_peak')
          .limit(100);
        if (plansError) throw plansError;
        data = plans || [];
        break;
        
      case 'dnsps':
      case 'networks':
        tableName = 'dnsps';
        const { data: dnsps, error: dnspsError } = await supabase
          .from('dnsps')
          .select('id, network, state, postcode_start, postcode_end, export_cap_kw')
          .limit(50);
        if (dnspsError) throw dnspsError;
        data = dnsps || [];
        break;
        
      case 'training_metrics':
      case 'ml_performance':
        tableName = 'training_metrics';
        const { data: metrics, error: metricsError } = await supabase
          .from('training_metrics')
          .select('id, metric_type, value, metadata, created_at')
          .limit(100);
        if (metricsError) throw metricsError;
        data = metrics || [];
        break;
        
      default:
        // Check ml_vectors as fallback
        tableName = 'ml_vectors';
        const { data: vectors, error: vectorsError } = await supabase
          .from('ml_vectors')
          .select('embedding, meta')
          .eq('kind', source)
          .limit(200);
        if (!vectorsError && vectors && vectors.length > 0) {
          const embeddings: number[][] = [];
          for (const vector of vectors) {
            if (vector.embedding) {
              try {
                const binaryString = atob(vector.embedding);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
                }
                const floats = new Float32Array(bytes.buffer);
                embeddings.push(Array.from(floats));
              } catch (decodeError) {
                console.warn(`Failed to decode embedding for ${source}:`, decodeError);
              }
            }
          }
          if (embeddings.length > 0) {
            console.log(`✅ Found ${embeddings.length} real ML vectors for ${source}`);
            return { embeddings, isReal: true };
          }
        }
        break;
    }
    
    if (data.length === 0) {
      console.log(`⚠️ No real data found for ${source} in ${tableName}, using synthetic fallback`);
      return { embeddings: generateFallbackEmbeddings(source), isReal: false };
    }
    
    // Convert database records to embeddings
    const embeddings: number[][] = [];
    
    for (const record of data) {
      const features: number[] = [];
      
      // Extract numerical features from the record
      Object.entries(record).forEach(([key, value]) => {
        if (typeof value === 'number') {
          features.push(value);
        } else if (typeof value === 'string') {
          // Convert strings to numerical features (hash-based)
          const hash = value.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
          features.push((hash % 1000) / 1000); // Normalize to 0-1
        } else if (value && typeof value === 'object') {
          // Handle JSON fields by extracting numerical values
          const jsonStr = JSON.stringify(value);
          const hash = jsonStr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
          features.push((hash % 1000) / 1000);
        }
      });
      
      // Ensure consistent embedding dimension (pad or truncate to 64)
      while (features.length < 64) features.push(Math.random() * 0.1);
      if (features.length > 64) features.splice(64);
      
      embeddings.push(features);
    }
    
    console.log(`✅ Generated ${embeddings.length} real embeddings from ${tableName} for ${source}`);
    return { embeddings, isReal: true };
    
  } catch (error) {
    console.warn(`Failed to generate real embeddings for ${source}:`, error);
    return { embeddings: generateFallbackEmbeddings(source), isReal: false };
  }
}

function generateFallbackEmbeddings(source: string): number[][] {
  // Generate deterministic synthetic embeddings
  const seed = source.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const rnd = mulberry32(seed + 42);
  const center = Array.from({length: 64}, (_, i) => (i + 1) * (seed + 1) * 0.001);
  const n = Math.min(100, 20 + Math.floor(rnd() * 80)); // Variable count per source
  const arr: number[][] = [];
  
  for (let k = 0; k < n; k++) {
    arr.push(center.map(c => c + (rnd() - 0.5) * 0.3));
  }
  
  return arr;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sources }: EmbeddingRequest = await req.json();

    console.log(`📊 Generating embeddings for sources: ${sources.join(', ')}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const result: (EmbeddingSet & { isReal?: boolean })[] = [];
    let hasRealData = false;
    
    for (let i = 0; i < sources.length; i++) {
      const source = sources[i];
      const { embeddings, isReal } = await generateRealEmbeddings(supabase, source);
      if (isReal) hasRealData = true;
      
      result.push({
        source,
        items: embeddings,
        labels: embeddings.map((_, idx) => `${source}_${idx}`),
        isReal
      });
    }
    
    console.log(`✅ Generated ${result.length} embedding sets (real data: ${hasRealData})`);
    
    // Add metadata to response
    const response = {
      embeddings: result,
      metadata: {
        hasRealData,
        timestamp: new Date().toISOString(),
        totalSets: result.length,
        realSets: result.filter(r => r.isReal).length
      }
    };

    return new Response(JSON.stringify(response), {
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json' 
      },
    });

  } catch (error) {
    console.error('❌ Error generating embeddings:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate embeddings',
        details: error.message 
      }),
      {
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
      }
    );
  }
});