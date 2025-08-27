import { registerAdapter } from "@/ai/integrations/registry";

async function infer({ audioUrl, lang="en" }: {audioUrl: string; lang?: string}) {
  try {
    const r = await fetch("/functions/v1/whisper-cpp", {
      method: "POST", 
      body: JSON.stringify({ audioUrl, lang })
    });
    if (!r.ok) throw new Error("serverless_unavailable");
    return await r.json();
  } catch {
    return { text: "", segments: [], note: "whisper offline" };
  }
}

registerAdapter({ 
  name: "asr_whispercpp", 
  category: "asr", 
  infer, 
  health: async() => ({ok: true}) 
});