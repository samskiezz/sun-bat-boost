import { registerAdapter } from "@/ai/integrations/registry";

async function infer({ embeddings, query, topk=5 }: {
  embeddings: number[][]; 
  query: number[]; 
  topk?: number;
}) {
  try {
    const r = await fetch("/functions/v1/faiss", {
      method: "POST", 
      body: JSON.stringify({ embeddings, query, topk })
    });
    if (!r.ok) throw new Error("serverless_unavailable");
    return await r.json();
  } catch {
    return { ids: [], scores: [] };
  }
}

registerAdapter({ 
  name: "vector_faiss", 
  category: "vector", 
  infer, 
  health: async() => ({ok: true}) 
});