import { registerAdapter } from "@/ai/integrations/registry";

async function infer({ features }: {features: number[][]}) {
  try {
    const r = await fetch("/functions/v1/xgboost", {
      method: "POST", 
      body: JSON.stringify({ features })
    });
    if (!r.ok) throw new Error("serverless_unavailable");
    return await r.json();
  } catch {
    return { yhat: features.map(() => 0) };
  }
}

registerAdapter({ 
  name: "ml_xgboost", 
  category: "ml", 
  infer, 
  health: async() => ({ok: true}) 
});