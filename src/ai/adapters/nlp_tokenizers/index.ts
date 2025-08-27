import { registerAdapter } from "@/ai/integrations/registry";

let tok: any;

async function infer({ bpe }: {bpe: any}) { 
  // tok = tok || await Tokenizer.fromOptions({ model: bpe }); 
  return { ok: true }; 
}

registerAdapter({ 
  name: "nlp_tokenizers", 
  category: "nlp", 
  infer, 
  health: async() => ({ok: true}) 
});