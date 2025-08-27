import { registerAdapter } from "@/ai/integrations/registry";

async function infer({ op, args }: {op: string; args: any}) { 
  return { ok: true }; 
}

registerAdapter({ 
  name: "opencv_js", 
  category: "vision", 
  infer, 
  health: async() => ({ok: true}) 
});