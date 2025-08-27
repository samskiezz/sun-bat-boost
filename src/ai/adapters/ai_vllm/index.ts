import { registerAdapter } from "@/ai/integrations/registry";

async function infer({ prompt, max_tokens=256 }: {prompt: string; max_tokens?: number}) {
  try {
    const r = await fetch("/functions/v1/vllm", {
      method: "POST", 
      body: JSON.stringify({ prompt, max_tokens })
    });
    if (!r.ok) throw new Error("serverless_unavailable");
    return await r.json();
  } catch {
    return { text: "(vLLM offline)" };
  }
}

registerAdapter({ 
  name: "ai_vllm", 
  category: "llm", 
  infer, 
  health: async() => ({ok: true}) 
});