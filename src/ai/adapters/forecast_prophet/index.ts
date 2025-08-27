import { registerAdapter } from "@/ai/integrations/registry";

async function infer({ series }: {series: Array<{ds: string; y: number}>}) {
  try {
    const r = await fetch("/functions/v1/prophet", {
      method: "POST", 
      body: JSON.stringify({ series })
    });
    if (!r.ok) throw new Error("serverless_unavailable");
    return await r.json();
  } catch {
    return { forecast: [] };
  }
}

registerAdapter({ 
  name: "forecast_prophet", 
  category: "forecast", 
  infer, 
  health: async() => ({ok: true}) 
});