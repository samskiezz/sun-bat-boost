import { registerAdapter } from "@/ai/integrations/registry";

async function infer({ task, params }: {task: string; params: any}) {
  try {
    const r = await fetch("/functions/v1/deepspeed", {
      method: "POST", 
      body: JSON.stringify({ task, params })
    });
    if (!r.ok) throw new Error("serverless_unavailable");
    return await r.json();
  } catch {
    return { ok: false };
  }
}

registerAdapter({ 
  name: "ai_deepspeed", 
  category: "ai", 
  infer, 
  health: async() => ({ok: true}) 
});