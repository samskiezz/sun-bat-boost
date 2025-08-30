import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { points, k = 5 } = await req.json();
    
    console.log(`Matching polygon with ${points?.length || 0} points, k=${k}`);
    
    // TODO: real vector search; stub few matches for now
    const matches = Array.from({ length: Math.min(k, 8) }, (_, i) => ({
      id: `site-${i + 1}`,
      score: Math.max(0.1, 0.95 - i * 0.12 - Math.random() * 0.1),
      label: `Similar Roof ${i + 1}`,
      metadata: {
        area: Math.floor(Math.random() * 200) + 50,
        location: `Building ${String.fromCharCode(65 + i)}`,
        confidence: Math.max(0.6, 0.9 - i * 0.08)
      }
    }));
    
    // Sort by score descending
    matches.sort((a, b) => b.score - a.score);
    
    return new Response(
      JSON.stringify({ 
        success: true,
        matches,
        total_candidates: matches.length,
        query_info: {
          polygon_vertices: points?.length || 0,
          requested_k: k
        }
      }), 
      { 
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json" 
        } 
      }
    );

  } catch (error) {
    console.error('Error in ml-poly-match:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }), 
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json" 
        } 
      }
    );
  }
});