import { registerAdapter } from "@/ai/integrations/registry";

async function infer({ series, covariates }: {series: number[]; covariates?: any}) {
  try {
    const r = await fetch("/functions/v1/pytorch-forecasting", {
      method: "POST", 
      body: JSON.stringify({ series, covariates })
    });
    if (!r.ok) throw new Error("serverless_unavailable");
    return await r.json();
  } catch {
    return { forecast: [] };
  }
}

registerAdapter({ 
  name: "forecast_tft", 
  category: "forecast", 
  infer, 
  health: async() => ({ok: true}) 
});