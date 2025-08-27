import Tesseract from "tesseract.js";
import { registerAdapter } from "@/ai/integrations/registry";

async function infer({ imageData, lang="eng" }: {imageData: string|Blob; lang?: string}) {
  const { data } = await Tesseract.recognize(imageData, lang);
  return { 
    text: data.text, 
    blocks: data.blocks, 
    confidence: data.confidence ?? 0.85 
  };
}

registerAdapter({ 
  name: "ocr_tesseract", 
  category: "ocr", 
  infer, 
  health: async() => ({ok: true}) 
});