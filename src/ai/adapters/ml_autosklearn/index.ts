import { registerAdapter } from "@/ai/integrations/registry";

async function infer({ X, y }: {X: number[][]; y: number[]}) {
  try {
    const r = await fetch("/functions/v1/autosklearn", {
      method: "POST", 
      body: JSON.stringify({ X, y })
    });
    if (!r.ok) throw new Error("serverless_unavailable");
    return await r.json();
  } catch {
    return { best_model: "", score: 0 };
  }
}

registerAdapter({ 
  name: "ml_autosklearn", 
  category: "ml", 
  infer, 
  health: async() => ({ok: true}) 
});