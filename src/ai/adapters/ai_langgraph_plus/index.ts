import { registerAdapter } from "@/ai/integrations/registry";

async function infer({ graph }: {graph: any}) { 
  return { ok: true }; 
}

registerAdapter({ 
  name: "ai_langgraph_plus", 
  category: "ai", 
  infer, 
  health: async() => ({ok: true}) 
});