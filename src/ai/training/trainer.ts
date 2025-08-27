import { subscribe, publish } from "@/ai/orchestrator/bus";
import { put } from "@/ai/featureStore";

subscribe("train.example" as any, (e: any) => { 
  put("train:" + Date.now(), e.payload); 
});

subscribe("train.run" as any, async (e: any) => { 
  publish({ 
    topic: "model.updated", 
    model_id: e.target, 
    version: "v" + Date.now() 
  } as any); 
});