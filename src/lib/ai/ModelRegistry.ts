// AI Model Registry - Manages 15+ ML models for energy intelligence

import { callAdapter } from "@/ai/integrations/registry";
import { getCurrentWeights } from "@/hooks/useTrainingState";

export interface MLModel {
  id: string;
  version: string;
  name: string;
  consumes: string[];
  produces: string[];
  accuracy?: number;
  latency?: number;
  lastUpdated: Date;
  infer(inputs: any): Promise<{ value: any; confidence: number }>;
  train?(dataset: any[]): Promise<void>;
}

export class ModelRegistry {
  private models: Map<string, MLModel> = new Map();
  private loadedModels: Set<string> = new Set();

  constructor() {
    this.initializeModels();
  }

  private initializeModels() {
    // Register all 15+ models
    const modelConfigs = [
      { id: 'M0', name: 'Doc Layout Detector', consumes: ['raw_pdf'], produces: ['doc.parsed'] },
      { id: 'M1', name: 'Bill Field Extractor', consumes: ['doc.parsed'], produces: ['bill.extracted'] },
      { id: 'M2', name: 'TOU Window Parser', consumes: ['bill.extracted'], produces: ['plan.parsed'] },
      { id: 'M3', name: 'Plan Type Classifier', consumes: ['plan.parsed'], produces: ['plan.classified'] },
      { id: 'M4', name: 'Load Shape Generator', consumes: ['bill.extracted'], produces: ['load.estimated'] },
      { id: 'M5', name: 'PV Yield Estimator', consumes: ['location', 'system'], produces: ['pv.estimated'] },
      { id: 'M6', name: 'Auto-Sizing Optimizer', consumes: ['load.estimated', 'constraints'], produces: ['rec.sizing'] },
      { id: 'M7', name: 'Dispatch Optimizer', consumes: ['rec.sizing', 'load.estimated'], produces: ['dispatch.sim'] },
      { id: 'M8', name: 'Plan Ranker', consumes: ['dispatch.sim', 'roi.calculated'], produces: ['rec.plan'] },
      { id: 'M9', name: 'Quote Component Extractor', consumes: ['quote_pdf'], produces: ['quote.parsed'] },
      { id: 'M10', name: 'ROI Preview Regressor', consumes: ['rec.sizing'], produces: ['roi.calculated'] },
      { id: 'M11', name: 'Confidence Calibrator', consumes: ['*'], produces: ['confidence.calibrated'] },
      { id: 'M12', name: 'Anomaly Detector', consumes: ['*'], produces: ['anomaly.flagged'] },
      { id: 'M13', name: 'User Segment Clustering', consumes: ['user.profile'], produces: ['segment.classified'] },
      { id: 'M14', name: 'Tariff Forecaster', consumes: ['historical.tariffs'], produces: ['tariff.forecast'] },
      { id: 'M15', name: 'VPP Impact Estimator', consumes: ['battery.config'], produces: ['vpp.impact'] }
    ];

    modelConfigs.forEach(config => {
      const model: MLModel = {
        ...config,
        version: '1.0.0',
        accuracy: 0.85 + Math.random() * 0.13, // Simulate varying accuracy
        latency: 50 + Math.random() * 200, // Simulate varying latency
        lastUpdated: new Date(),
        infer: this.createMockInferFunction(config.id, config.produces[0]),
        train: this.createMockTrainFunction(config.id)
      };
      
      this.models.set(config.id, model);
    });
  }

  private createMockInferFunction(modelId: string, outputType: string) {
    return async (inputs: any): Promise<{ value: any; confidence: number }> => {
      try {
        // Try to call real adapters for key models
        const adapterMap: Record<string, string> = {
          M10: "ml_xgboost",       // ROI regressor
          M4:  "ml_lightgbm",      // load estimator
          M7:  "ai_stable_baselines3" // dispatch policy
        };
        
        const adapterName = adapterMap[modelId];
        if (adapterName) {
          console.log(`🔧 Calling adapter ${adapterName} for model ${modelId}`);
          const result = await callAdapter(adapterName, inputs);
          
          // Apply training weights to influence results
          const weights = getCurrentWeights();
          if (weights?.performance?.overallScore && result?.yhat != null && typeof result.yhat === "number") {
            const delta = weights.perFunction?.roi?.delta || 0;
            result.yhat = result.yhat * (1 + delta);
            console.log(`🎯 Applied training delta ${delta} to model ${modelId}`);
          }
          
          return { value: result, confidence: 0.85 };
        }
      } catch (error) {
        console.warn(`⚠️ Adapter ${modelId} failed, using fallback:`, error);
      }
      
      // Fallback to mock implementation
      await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 100));
      
      const confidence = 0.7 + Math.random() * 0.3;
      
      // Generate mock outputs based on type
      let value: any;
      switch (outputType) {
        case 'doc.parsed':
          value = { text: 'Mock extracted text', layout: 'invoice', fields: {} };
          break;
        case 'bill.extracted':
          value = { retailer: 'AGL', plan: 'Essentials', nmi: '6001234567890', rates: {} };
          break;
        case 'load.estimated':
          value = { hourly_kwh: Array(24).fill(0).map(() => Math.random() * 2), archetype: 'typical' };
          break;
        case 'rec.sizing':
          value = { pv_kw: 6.5, battery_kwh: 13.5, constraints: ['roof_space', 'export_limit'] };
          break;
        case 'roi.calculated':
          value = { payback: 7.2, npv: 15420, irr: 0.142 };
          break;
        default:
          value = { result: 'mock_output', modelId };
      }
      
      return { value, confidence };
    };
  }

  private createMockTrainFunction(modelId: string) {
    return async (dataset: any[]): Promise<void> => {
      // Simulate training time
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
      
      // Update model accuracy
      const model = this.models.get(modelId);
      if (model) {
        model.accuracy = Math.min(0.99, (model.accuracy || 0.8) + Math.random() * 0.05);
        model.lastUpdated = new Date();
      }
    };
  }

  // Get model by ID
  getModel(id: string): MLModel | undefined {
    return this.models.get(id);
  }

  // Get all models
  getAllModels(): MLModel[] {
    return Array.from(this.models.values());
  }

  // Get models by capability
  getModelsByCapability(consumes?: string, produces?: string): MLModel[] {
    return this.getAllModels().filter(model => {
      const consumesMatch = !consumes || model.consumes.includes(consumes);
      const producesMatch = !produces || model.produces.includes(produces);
      return consumesMatch && producesMatch;
    });
  }

  // Load model (simulate loading)
  async loadModel(id: string): Promise<boolean> {
    if (!this.models.has(id)) return false;
    
    // Simulate loading time
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 500));
    
    this.loadedModels.add(id);
    return true;
  }

  // Check if model is loaded
  isModelLoaded(id: string): boolean {
    return this.loadedModels.has(id);
  }

  // Update model version (for canary deployment)
  updateModel(id: string, updates: Partial<MLModel>): boolean {
    const model = this.models.get(id);
    if (!model) return false;
    
    Object.assign(model, updates);
    return true;
  }

  // Get registry stats
  getStats() {
    const models = this.getAllModels();
    return {
      totalModels: models.length,
      loadedModels: this.loadedModels.size,
      averageAccuracy: models.reduce((sum, m) => sum + (m.accuracy || 0), 0) / models.length,
      averageLatency: models.reduce((sum, m) => sum + (m.latency || 0), 0) / models.length
    };
  }
}

// Global model registry
export const modelRegistry = new ModelRegistry();