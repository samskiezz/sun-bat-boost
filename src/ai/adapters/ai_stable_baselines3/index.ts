import { registerAdapter } from "@/ai/integrations/registry";

async function infer({ env }: {env: any}) {
  try {
    const r = await fetch("/functions/v1/stable-baselines3", {
      method: "POST", 
      body: JSON.stringify({ env })
    });
    if (!r.ok) throw new Error("serverless_unavailable");
    return await r.json();
  } catch {
    return { policy: "", reward: 0 };
  }
}

registerAdapter({ 
  name: "ai_stable_baselines3", 
  category: "ai", 
  infer, 
  health: async() => ({ok: true}) 
});