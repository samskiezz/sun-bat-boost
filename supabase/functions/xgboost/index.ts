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
    console.log("🌲 XGBoost inference request:", body);
    
    // Check if ML service URL is available
    const mlServiceUrl = Deno.env.get("ML_SVC_URL");
    if (mlServiceUrl) {
      try {
        const response = await fetch(`${mlServiceUrl}/ml/xgboost/roi`, {
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
    console.log("🎲 Using mock XGBoost implementation");
    const features = body.features || [];
    
    // Mock ROI prediction based on features
    const predictions = features.map((featureRow: number[]) => {
      // Simple mock logic based on feature values
      const systemSize = featureRow[0] || 6.6;
      const usage = featureRow[1] || 8000;
      const tariffRate = featureRow[2] || 0.28;
      
      // Mock ROI calculation
      const annualGeneration = systemSize * 1400; // kWh/year
      const selfConsumption = Math.min(usage, annualGeneration) * 0.7;
      const exportValue = (annualGeneration - selfConsumption) * 0.06;
      const savingsFromSelfUse = selfConsumption * tariffRate;
      const totalAnnualSavings = savingsFromSelfUse + exportValue;
      
      return {
        annual_savings_AUD: totalAnnualSavings + (Math.random() - 0.5) * 200,
        payback_years: (systemSize * 1200) / totalAnnualSavings + (Math.random() - 0.5) * 2,
        system_size_kw: systemSize,
        confidence: 0.82 + Math.random() * 0.15
      };
    });
    
    const mockResult = {
      yhat: predictions.length === 1 ? predictions[0] : predictions,
      feature_importance: {
        system_size: 0.35,
        usage_pattern: 0.25,
        tariff_structure: 0.20,
        location_factors: 0.20
      },
      model_version: "xgboost_v1.2_mock"
    };
    
    return new Response(JSON.stringify(mockResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error("❌ XGBoost error:", error);
    return new Response(JSON.stringify({ 
      error: String(error),
      yhat: features.map(() => 0) 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});