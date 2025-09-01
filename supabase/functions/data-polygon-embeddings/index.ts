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

async function fetchRealEmbeddings(supabase: any, source: string): Promise<number[][]> {
  try {
    const { data: vectors, error } = await supabase
      .from('ml_vectors')
      .select('embedding, meta')
      .eq('kind', source)
      .limit(200);
    
    if (error) throw error;
    
    if (vectors && vectors.length > 0) {
      const embeddings: number[][] = [];
      
      for (const vector of vectors) {
        if (vector.embedding) {
          try {
            // Decode base64 embedding back to float array
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
        console.log(`✅ Found ${embeddings.length} real embeddings for ${source}`);
        return embeddings;
      }
    }
    
    console.log(`⚠️ No real embeddings found for ${source}, using fallback`);
    return generateFallbackEmbeddings(source);
  } catch (error) {
    console.warn(`Failed to fetch real embeddings for ${source}:`, error);
    return generateFallbackEmbeddings(source);
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

    const result: EmbeddingSet[] = [];
    
    for (let i = 0; i < sources.length; i++) {
      const source = sources[i];
      const items = await fetchRealEmbeddings(supabase, source);
      result.push({
        source,
        items,
        labels: items.map((_, idx) => `${source}_${idx}`)
      });
    }

    console.log(`✅ Generated ${result.length} embedding sets`);

    return new Response(JSON.stringify(result), {
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