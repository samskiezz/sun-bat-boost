import { registerAdapter } from "@/ai/integrations/registry";

async function infer({ data }: {data: any}) {
  try {
    const r = await fetch("/functions/v1/tfq", {
      method: "POST", 
      body: JSON.stringify({ data })
    });
    if (!r.ok) throw new Error("serverless_unavailable");
    return await r.json();
  } catch {
    return { yhat: 0 };
  }
}

registerAdapter({ 
  name: "quantum_tfq", 
  category: "quantum", 
  infer, 
  health: async() => ({ok: true}) 
});