import { registerAdapter } from "@/ai/integrations/registry";

async function infer({ text, task="ner" }: {text: string; task?: string}) {
  try {
    const r = await fetch("/functions/v1/flair", {
      method: "POST", 
      body: JSON.stringify({ text, task })
    });
    if (!r.ok) throw new Error("serverless_unavailable");
    return await r.json();
  } catch {
    return { entities: [] };
  }
}

registerAdapter({ 
  name: "nlp_flair", 
  category: "nlp", 
  infer, 
  health: async() => ({ok: true}) 
});