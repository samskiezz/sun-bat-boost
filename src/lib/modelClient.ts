// Single source of truth for ML predictions
const ML_SVC_URL = import.meta.env.VITE_ML_SVC_URL || 'http://localhost:8000';

export interface PredictionResult {
  value: any;
  conf: { p50: number; p90: number };
  sourceModel: string;
  version: string;
  telemetry?: {
    p95: number;
    delta: number;
    metricDelta?: number;
  };
  error?: string;
}

export interface ROIInput {
  usage_30min: number[];
  tariff: {
    import: Array<{ price: number; start: string; end: string }>;
    export?: Array<{ price: number; start: string; end: string }>;
  };
  shading_index: number;
  roof_params?: any;
  system_size_kw?: number;
}

export interface BatteryROIInput extends ROIInput {
  battery_params: {
    capacity: number;
    power: number;
    efficiency: number;
  };
  pv_estimate_30min?: number[];
}

export interface ForecastInput {
  usage_30min: number[];
  weather_data?: any;
  seasonal_adjustment?: boolean;
}

// Core prediction function - single pipeline for all tasks
export async function predict(
  task: "solar_roi" | "battery_roi" | "forecast",
  input: ROIInput | BatteryROIInput | ForecastInput
): Promise<PredictionResult> {
  try {
    const response = await fetch(`${ML_SVC_URL}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ task, input })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const result = await response.json();
    
    // Validate response structure
    if (!result.value || !result.sourceModel) {
      throw new Error('Invalid response format from ML service');
    }

    return result;
  } catch (error) {
    console.error(`Prediction error for ${task}:`, error);
    
    // Return fallback result with error flag
    return getFallbackPrediction(task, input, error);
  }
}

function getFallbackPrediction(task: string, input: any, error: any): PredictionResult {
  console.warn(`Using fallback prediction for ${task} due to:`, error);
  
  if (task === "solar_roi") {
    const usage = input.usage_30min || [];
    const annualUsage = usage.length > 0 ? (usage.reduce((a, b) => a + b, 0) * 365 / usage.length) : 8000;
    const savings = annualUsage * 0.25 * 0.30; // Basic estimation

    return {
      value: {
        annual_savings_AUD: Math.round(savings),
        system_size_kw: Math.round((annualUsage / 1500) * 10) / 10
      },
      conf: { p50: savings, p90: savings * 1.1 },
      sourceModel: "fallback",
      version: "v0.1",
      telemetry: { p95: 120, delta: 0 },
      error: `ML service unavailable: ${error.message}`
    };
  }
  
  if (task === "battery_roi") {
    return {
      value: {
        annual_savings_AUD: 1800,
        payback_years: 9.2,
        cycle_schedule: generateFallbackSchedule()
      },
      conf: { p50: 1800, p90: 1980 },
      sourceModel: "fallback",
      version: "v0.1", 
      telemetry: { p95: 130, delta: 0 },
      error: `ML service unavailable: ${error.message}`
    };
  }
  
  if (task === "forecast") {
    const baseUsage = input.usage_30min?.[0] || 2.5;
    const forecast = Array.from({ length: 48 }, (_, i) => {
      const hour = i % 24;
      // Simple daily pattern
      return baseUsage * (1 + 0.3 * Math.sin(2 * Math.PI * (hour - 6) / 24));
    });

    return {
      value: { forecast_kwh: forecast },
      conf: { p50: forecast[0], p90: forecast[0] * 1.1 },
      sourceModel: "fallback",
      version: "v0.1",
      telemetry: { p95: 85, delta: 0 },
      error: `ML service unavailable: ${error.message}`
    };
  }

  return {
    value: {},
    conf: { p50: 0, p90: 0 },
    sourceModel: "unknown",
    version: "v0.0",
    error: `No fallback available for task: ${task}`
  };
}

function generateFallbackSchedule() {
  return Array.from({ length: 24 }, (_, hour) => {
    if (hour >= 1 && hour <= 5) {
      return { hour, charge_kw: 3.5, discharge_kw: 0 };
    } else if (hour >= 17 && hour <= 21) {
      return { hour, charge_kw: 0, discharge_kw: 4.2 };
    } else {
      return { hour, charge_kw: 0, discharge_kw: 0 };
    }
  });
}

// Health check for ML service
export async function checkMLServiceHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${ML_SVC_URL}/healthz`);
    return response.ok;
  } catch {
    return false;
  }
}

// Get service status and model versions
export async function getServiceStatus() {
  try {
    const response = await fetch(`${ML_SVC_URL}/status`);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Failed to get service status:', error);
  }
  return { status: 'unavailable', models: {}, versions: {} };
}