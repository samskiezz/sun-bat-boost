import { registerAdapter } from "@/ai/integrations/registry";

async function infer({ text, op="tokenize" }: {text: string; op?: string}) {
  try {
    const r = await fetch("/functions/v1/nltk", {
      method: "POST", 
      body: JSON.stringify({ text, op })
    });
    if (!r.ok) throw new Error("serverless_unavailable");
    return await r.json();
  } catch {
    return { tokens: text.split(" ") };
  }
}

registerAdapter({ 
  name: "nlp_nltk", 
  category: "nlp", 
  infer, 
  health: async() => ({ok: true}) 
});