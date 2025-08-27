import { registerAdapter } from "@/ai/integrations/registry";

async function infer(model: any) {
  try {
    const r = await fetch("/functions/v1/or-tools", {
      method: "POST", 
      body: JSON.stringify(model)
    });
    if (!r.ok) throw new Error("serverless_unavailable");
    return await r.json();
  } catch {
    return { schedule: [], cost: 0, note: "ORTools offline; heuristic" };
  }
}

registerAdapter({ 
  name: "optimizer_ortools", 
  category: "optimizer", 
  infer, 
  health: async() => ({ok: true}) 
});