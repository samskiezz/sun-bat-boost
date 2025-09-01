import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const body = await req.json();
    console.log("🧠 RLlib inference request:", body);
    
    // Check if ML service URL is available
    const mlServiceUrl = Deno.env.get("ML_SVC_URL");
    if (mlServiceUrl) {
      try {
        const response = await fetch(`${mlServiceUrl}/rl/rllib/ppo`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log("✅ ML service response:", result);
          return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      } catch (error) {
        console.warn("⚠️ ML service unavailable:", error);
      }
    }
    
    // Fallback to mock implementation
    console.log("🎲 Using mock RLlib implementation");
    const mockResult = {
      action: Array.from({ length: 3 }, () => Math.random()), // Continuous action space
      policy: "ppo",
      reward: Math.random() * 100,
      confidence: 0.8 + Math.random() * 0.15,
      value_estimate: Math.random() * 50
    };
    
    return new Response(JSON.stringify(mockResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error("❌ RLlib error:", error);
    return new Response(JSON.stringify({ 
      error: String(error),
      policy: "fallback",
      reward: 0 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});