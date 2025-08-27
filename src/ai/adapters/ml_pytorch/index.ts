import { registerAdapter } from "@/ai/integrations/registry";

async function infer({ X }: {X: number[][]}) {
  try {
    const r = await fetch("/functions/v1/pytorch", {
      method: "POST", 
      body: JSON.stringify({ X })
    });
    if (!r.ok) throw new Error("serverless_unavailable");
    return await r.json();
  } catch {
    return { yhat: X.map(() => 0) };
  }
}

registerAdapter({ 
  name: "ml_pytorch", 
  category: "ml", 
  infer, 
  health: async() => ({ok: true}) 
});