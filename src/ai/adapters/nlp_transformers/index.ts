import { pipeline } from "@huggingface/transformers";
import { registerAdapter } from "@/ai/integrations/registry";

let zsc: any, sum: any, emb: any;

async function infer({task, text, model, labels}: {
  task: "zero-shot"|"summarization"|"embedding"; 
  text: string; 
  model?: string; 
  labels?: string[];
}) {
  if (task === "zero-shot") { 
    zsc = zsc || await pipeline("zero-shot-classification", model); 
    return await zsc(text, labels || []); 
  }
  if (task === "summarization") { 
    sum = sum || await pipeline("summarization", model); 
    return await sum(text); 
  }
  if (task === "embedding") { 
    emb = emb || await pipeline("feature-extraction", model); 
    return await emb(text); 
  }
  throw new Error("unknown_task");
}

registerAdapter({ 
  name: "nlp_transformers", 
  category: "nlp", 
  infer, 
  health: async() => ({ok: true}) 
});