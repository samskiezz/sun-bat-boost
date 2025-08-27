import { registerAdapter } from "@/ai/integrations/registry";

async function infer({ circuit, params }: {circuit: any; params: any}) {
  try {
    const r = await fetch("/functions/v1/pennylane", {
      method: "POST", 
      body: JSON.stringify({ circuit, params })
    });
    if (!r.ok) throw new Error("serverless_unavailable");
    return await r.json();
  } catch {
    return { expectation: 0 };
  }
}

registerAdapter({ 
  name: "quantum_pennylane", 
  category: "quantum", 
  infer, 
  health: async() => ({ok: true}) 
});