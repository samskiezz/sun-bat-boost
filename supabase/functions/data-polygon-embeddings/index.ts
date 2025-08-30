import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

function makeBlob(seed: number): number[][] {
  // deterministic pseudo-random around a center that shifts per seed
  const rnd = mulberry32(seed + 42);
  const center = Array.from({length: 5}, (_, i) => (i + 1) * (seed + 1) * 0.1);
  const n = 120;
  const arr: number[][] = [];
  
  for (let k = 0; k < n; k++) {
    arr.push(center.map(c => c + (rnd() - 0.5) * 0.6));
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

    const result: EmbeddingSet[] = (sources || []).map((source: string, i: number) => ({
      source,
      items: makeBlob(i), // deterministic blobs in 5D then projected
      labels: [`${source}_${i}_sample`] // optional labels
    }));

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