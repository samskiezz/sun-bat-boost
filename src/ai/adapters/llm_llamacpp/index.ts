import { registerAdapter } from "@/ai/integrations/registry";

async function infer({ prompt, max_tokens=256, temp=0.2 }: {
  prompt: string; 
  max_tokens?: number; 
  temp?: number;
}) {
  try {
    const r = await fetch("/functions/v1/llama-cpp", {
      method: "POST", 
      body: JSON.stringify({ prompt, max_tokens, temp })
    });
    if (!r.ok) throw new Error("serverless_unavailable");
    return await r.json();
  } catch {
    return { text: "(LLM offline)" };
  }
}

registerAdapter({ 
  name: "llm_llamacpp", 
  category: "llm", 
  infer, 
  health: async() => ({ok: true}) 
});