import { describe, it, expect } from "vitest";
import { listAdapters } from "@/ai/integrations/registry";
import { modelRegistry } from "@/lib/ai/ModelRegistry";

const CLAIMS = [
  { id:"RL1", name:"DQN",                 adapter:"ai_stable_baselines3", endpoint:/\/functions\/v1\/stable-baselines3/ },
  { id:"RL2", name:"Actor-Critic",        adapter:"ai_rllib", endpoint:/\/functions\/v1\/rllib/ },
  { id:"TR1", name:"Transformer",         adapter:"nlp_transformers" },
  { id:"TS1", name:"Forecast (Prophet)",  adapter:"forecast_prophet",     endpoint:/\/functions\/v1\/prophet/ },
  { id:"TS2", name:"Forecast (TFT)",      adapter:"forecast_tft",         endpoint:/\/functions\/v1\/pytorch-forecasting/ },
  { id:"M10", name:"ROI (XGBoost)",       adapter:"ml_xgboost",           endpoint:/\/functions\/v1\/xgboost/ },
];

function envHas(re: RegExp) {
  const base = "https://mkgcacuhdwpsfkbguddk.supabase.co";
  return re.test(`${base}/functions/v1/x`) || re.test("/functions/v1/x");
}

describe("Capability contract", () => {
  it("every claimed model has adapter + endpoint (if required)", async () => {
    const adapters = listAdapters();
    for (const c of CLAIMS) {
      if (c.adapter) {
        expect(adapters, `Missing adapter for ${c.name}`).toContain(c.adapter);
      }
      if (c.endpoint) {
        expect(envHas(c.endpoint), `Missing endpoint: ${c.name} ${c.endpoint}`).toBe(true);
      }
      expect(modelRegistry.getModel(c.id), `ModelRegistry missing: ${c.id} (${c.name})`).toBeDefined();
    }
  });
});