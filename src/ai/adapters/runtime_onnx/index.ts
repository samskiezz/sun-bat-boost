import * as ort from "onnxruntime-web";
import { registerAdapter } from "@/ai/integrations/registry";

async function infer({ modelUrl, inputs }: {
  modelUrl: string; 
  inputs: Record<string, {data: Float32Array; dims: number[]}>;
}) {
  const sess = await ort.InferenceSession.create(modelUrl);
  const feeds: any = {};
  for (const k of Object.keys(inputs)) { 
    feeds[k] = new ort.Tensor("float32", inputs[k].data, inputs[k].dims); 
  }
  return await sess.run(feeds);
}

registerAdapter({ 
  name: "runtime_onnx", 
  category: "runtime", 
  infer, 
  health: async() => ({ok: true}) 
});