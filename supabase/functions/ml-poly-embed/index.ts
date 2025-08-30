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
    const { points } = await req.json();
    
    console.log(`Embedding polygon with ${points?.length || 0} points`);
    
    // TODO: real embedding/features; stub response for now
    const features = { 
      perimeter: points?.length || 0,
      area: calculateSimpleArea(points || []),
      vertexCount: points?.length || 0
    };
    
    const embedding = Array.from({ length: 64 }, (_, i) => 
      Math.sin((i + 1) * Math.PI / 32) * (points?.length || 1) / 10
    );
    
    const signature = `poly-${points?.length || 0}-${Date.now()}`;
    
    return new Response(
      JSON.stringify({ 
        success: true,
        features, 
        embedding, 
        signature 
      }), 
      { 
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json" 
        } 
      }
    );

  } catch (error) {
    console.error('Error in ml-poly-embed:', error);
    
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

function calculateSimpleArea(points: [number, number][]): number {
  if (!points || points.length < 3) return 0;
  
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i][0] * points[j][1];
    area -= points[j][0] * points[i][1];
  }
  return Math.abs(area) / 2;
}