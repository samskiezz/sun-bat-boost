// Training client for admin operations
const ML_SVC_URL = import.meta.env.VITE_ML_SVC_URL || 'http://localhost:8000';

export interface TrainingRequest {
  task: 'roi' | 'forecast' | 'dispatch';
  dataset: {
    X?: number[][];
    y_annual_savings_AUD?: number[];
    sequences?: number[][][];
    targets?: number[][];
    [key: string]: any;
  };
  seed?: number;
  hyperparams?: Record<string, any>;
}

export interface TrainingResult {
  success: boolean;
  task: string;
  version: string;
  metrics: {
    mae: number;
    loss_curve: number[];
    [key: string]: any;
  };
  artifacts_path: string;
  error?: string;
}

export interface TrainingStatus {
  status: string;
  progress?: number;
  current_loss?: number;
  best_loss?: number;
  eta?: number;
  step_per_sec?: number;
  last_weight_hash?: string;
  artifacts_path?: string;
}

// Train a model (requires API key)
export async function trainModel(
  request: TrainingRequest,
  apiKey?: string
): Promise<TrainingResult> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }

    const response = await fetch(`${ML_SVC_URL}/train`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request)
    });

    const result = await response.json();

    if (!response.ok) {
      if (response.status === 422 && result.detail?.includes('NO_OP_TRAINING_DETECTED')) {
        throw new Error('NO_OP_TRAINING_DETECTED: Training blocked - no weight changes or insufficient loss improvement');
      }
      throw new Error(result.detail || `Training failed: ${response.status}`);
    }

    return result;
  } catch (error) {
    console.error('Training error:', error);
    throw error;
  }
}

// Get training status (for streaming updates)
export async function getTrainingStatus(jobId?: string): Promise<TrainingStatus> {
  try {
    const url = jobId ? `${ML_SVC_URL}/status?job_id=${jobId}` : `${ML_SVC_URL}/status`;
    const response = await fetch(url);
    
    if (response.ok) {
      return await response.json();
    }
    
    return { status: 'unknown' };
  } catch (error) {
    console.error('Status check failed:', error);
    return { status: 'error' };
  }
}

// List available models and their metrics
export async function listModels() {
  try {
    const response = await fetch(`${ML_SVC_URL}/models`);
    if (response.ok) {
      return await response.json();
    }
    return { models: [] };
  } catch (error) {
    console.error('Failed to list models:', error);
    return { models: [] };
  }
}

// Generate synthetic training data for testing
export function generateSyntheticROIData(nSamples: number = 100) {
  const X = [];
  const y = [];
  
  for (let i = 0; i < nSamples; i++) {
    const usageCount = Math.random() * 50 + 24; // 24-74 data points
    const totalUsage = Math.random() * 4000 + 6000; // 6000-10000 kWh/year
    const avgUsage = totalUsage / 365;
    const peakRate = Math.random() * 0.1 + 0.25; // 0.25-0.35 $/kWh
    const shading = Math.random() * 0.3; // 0-30% shading
    
    X.push([usageCount, totalUsage, avgUsage, peakRate, shading]);
    
    // Realistic savings calculation
    const solarGeneration = totalUsage * 0.8; // 80% offset
    const savings = Math.max(500, solarGeneration * peakRate * 0.25 * (1 - shading) - 1500);
    y.push(savings + (Math.random() - 0.5) * 400); // Add noise
  }
  
  return { X, y_annual_savings_AUD: y };
}

// Generate synthetic forecast data
export function generateSyntheticForecastData(nSamples: number = 200) {
  const sequences = [];
  const targets = [];
  
  for (let i = 0; i < nSamples; i++) {
    // 48-hour input sequence
    const sequence = [];
    for (let h = 0; h < 48; h++) {
      const basePattern = 2 + Math.sin(2 * Math.PI * h / 24) + 0.5 * Math.sin(4 * Math.PI * h / 24);
      const noise = (Math.random() - 0.5) * 0.6;
      sequence.push([basePattern + noise]); // Add feature dimension
    }
    
    // 24-hour target
    const target = [];
    for (let h = 48; h < 72; h++) {
      const basePattern = 2 + Math.sin(2 * Math.PI * h / 24) + 0.5 * Math.sin(4 * Math.PI * h / 24);
      const noise = (Math.random() - 0.5) * 0.4;
      target.push(basePattern + noise);
    }
    
    sequences.push(sequence);
    targets.push(target);
  }
  
  return { sequences, targets };
}

// Training helpers for different models
export class TrainingHelper {
  static async trainROIModel(apiKey?: string, samples: number = 100) {
    const dataset = generateSyntheticROIData(samples);
    
    return trainModel({
      task: 'roi',
      dataset,
      seed: Date.now() % 10000, // Vary seed to ensure changes
      hyperparams: {
        n_estimators: 300 + Math.floor(Math.random() * 200), // 300-500
        max_depth: 5 + Math.floor(Math.random() * 3), // 5-7
        learning_rate: 0.05 + Math.random() * 0.05 // 0.05-0.10
      }
    }, apiKey);
  }
  
  static async trainForecastModel(apiKey?: string, samples: number = 200) {
    const dataset = generateSyntheticForecastData(samples);
    
    return trainModel({
      task: 'forecast',
      dataset,
      seed: Date.now() % 10000,
      hyperparams: {
        epochs: 15 + Math.floor(Math.random() * 10), // 15-25
        batch_size: 16 + Math.floor(Math.random() * 16), // 16-32
        lstm_units: 32 + Math.floor(Math.random() * 32) // 32-64
      }
    }, apiKey);
  }
  
  static async trainDispatchModel(apiKey?: string) {
    const dataset = {
      tariff: {
        peak_rate: 0.32,
        offpeak_rate: 0.22,
        feed_in_tariff: 0.08
      },
      load_profile: Array.from({ length: 24 }, (_, h) => {
        // Realistic load pattern
        if (h >= 7 && h <= 9) return 3.5 + Math.random(); // Morning peak
        if (h >= 17 && h <= 21) return 4.2 + Math.random() * 1.5; // Evening peak
        if (h >= 10 && h <= 16) return 2.0 + Math.random(); // Daytime
        return 1.5 + Math.random() * 0.5; // Night
      }),
      battery_capacity: 13.5,
      solar_profile: Array.from({ length: 24 }, (_, h) => {
        if (h >= 6 && h <= 18) {
          return Math.max(0, 8 * Math.sin(Math.PI * (h - 6) / 12)) + Math.random();
        }
        return 0;
      })
    };
    
    return trainModel({
      task: 'dispatch',
      dataset,
      seed: Date.now() % 10000
    }, apiKey);
  }
}