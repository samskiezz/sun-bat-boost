import { registerAdapter } from "@/ai/integrations/registry";

async function infer({ nodes, edges, input }: {nodes: any[]; edges: any[]; input: any}) { 
  return { ok: true }; 
}

registerAdapter({ 
  name: "orchestration_langgraph", 
  category: "orchestration", 
  infer, 
  health: async() => ({ok: true}) 
});