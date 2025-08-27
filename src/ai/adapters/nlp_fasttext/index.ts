import { registerAdapter } from "@/ai/integrations/registry";

async function infer({ text }: {text: string}) {
  try {
    const r = await fetch("/functions/v1/fasttext", {
      method: "POST", 
      body: JSON.stringify({ text })
    });
    if (!r.ok) throw new Error("serverless_unavailable");
    return await r.json();
  } catch {
    return { labels: [], scores: [] };
  }
}

registerAdapter({ 
  name: "nlp_fasttext", 
  category: "nlp", 
  infer, 
  health: async() => ({ok: true}) 
});