import { registerAdapter } from "@/ai/integrations/registry";

async function infer({ circuit }: {circuit: any}) {
  try {
    const r = await fetch("/functions/v1/qiskit", {
      method: "POST", 
      body: JSON.stringify({ circuit })
    });
    if (!r.ok) throw new Error("serverless_unavailable");
    return await r.json();
  } catch {
    return { expectation: 0, note: "qiskit offline" };
  }
}

registerAdapter({ 
  name: "quantum_qiskit", 
  category: "quantum", 
  infer, 
  health: async() => ({ok: true}) 
});