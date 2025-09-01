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
    console.log("📈 Prophet forecast request:", body);
    
    // Check if ML service URL is available
    const mlServiceUrl = Deno.env.get("ML_SVC_URL");
    if (mlServiceUrl) {
      try {
        const response = await fetch(`${mlServiceUrl}/forecast/prophet`, {
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
    console.log("🎲 Using mock Prophet implementation");
    const series = body.series || [];
    const periods = body.periods || 30;
    
    // Generate mock forecast
    const lastValue = series.length > 0 ? series[series.length - 1].y : 100;
    const trend = 0.02; // 2% growth trend
    const forecast = [];
    
    for (let i = 0; i < periods; i++) {
      const seasonality = Math.sin((i / 7) * 2 * Math.PI) * 10; // Weekly seasonality
      const noise = (Math.random() - 0.5) * 5;
      const value = lastValue * (1 + trend) + seasonality + noise;
      
      forecast.push({
        ds: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString(),
        yhat: value,
        yhat_lower: value * 0.9,
        yhat_upper: value * 1.1
      });
    }
    
    const mockResult = {
      forecast,
      components: {
        trend: "increasing",
        seasonality: "weekly",
        confidence: 0.85
      }
    };
    
    return new Response(JSON.stringify(mockResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error("❌ Prophet error:", error);
    return new Response(JSON.stringify({ 
      error: String(error),
      forecast: [] 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});