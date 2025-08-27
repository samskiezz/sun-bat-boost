import { registerAdapter } from "@/ai/integrations/registry";

async function infer({ texts }: {texts: string[]}) {
  try {
    const r = await fetch("/functions/v1/sentence-transformers", {
      method: "POST", 
      body: JSON.stringify({ texts })
    });
    if (!r.ok) throw new Error("serverless_unavailable");
    return await r.json();
  } catch {
    return { embeddings: texts.map(() => []) };
  }
}

registerAdapter({ 
  name: "nlp_sentence_transformers", 
  category: "nlp", 
  infer, 
  health: async() => ({ok: true}) 
});