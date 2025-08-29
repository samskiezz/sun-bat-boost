import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TrainingMetrics {
  totalEpisodes: number;
  accuracy: number;
  efficiency: number;
  learningRate: number;
  loss: number;
  convergence: number;
}

interface ModelPerformance {
  solarSizing: number;
  batterySizing: number;
  costOptimization: number;
  rebateOptimization: number;
  overallScore: number;
}

interface TrainingState {
  metrics: TrainingMetrics;
  performance: ModelPerformance;
  lastUpdated: string;
}

const STORAGE_KEY = 'advanced_training_state';
const SUPABASE_TABLE = 'ai_model_weights';

const defaultState: TrainingState = {
  metrics: {
    totalEpisodes: 0,
    accuracy: 0,
    efficiency: 0,
    learningRate: 0.001,
    loss: 1.0,
    convergence: 0
  },
  performance: {
    solarSizing: 0,
    batterySizing: 0,
    costOptimization: 0,
    rebateOptimization: 0,
    overallScore: 0
  },
  lastUpdated: new Date().toISOString()
};

export function useTrainingState() {
  const [state, setState] = useState<TrainingState>(defaultState);
  const [isLoading, setIsLoading] = useState(true);

  // Load state on mount
  useEffect(() => {
    loadState();
  }, []);

  const loadState = useCallback(async () => {
    try {
      // Try to load from Supabase first
      const { data, error } = await supabase
        .from(SUPABASE_TABLE)
        .select('*')
        .eq('model_type', 'advanced_training_system')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (!error && data?.weights) {
        try {
          const savedState = data.weights as unknown as TrainingState;
          setState(savedState);
          // Also save to localStorage as cache
          localStorage.setItem(STORAGE_KEY, JSON.stringify(savedState));
        } catch (parseError) {
          console.warn('Failed to parse Supabase state:', parseError);
        }
      } else {
        // Fallback to localStorage
        const localState = localStorage.getItem(STORAGE_KEY);
        if (localState) {
          setState(JSON.parse(localState));
        }
      }
    } catch (error) {
      console.warn('Failed to load training state:', error);
      // Try localStorage as fallback
      const localState = localStorage.getItem(STORAGE_KEY);
      if (localState) {
        try {
          setState(JSON.parse(localState));
        } catch (parseError) {
          console.warn('Failed to parse local state:', parseError);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveState = useCallback(async (newState: TrainingState) => {
    setState(newState);
    
    // Save to localStorage immediately for fast access
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));

    // Save to Supabase in background
    try {
      await supabase
        .from(SUPABASE_TABLE)
        .upsert({
          model_type: 'advanced_training_system',
          version: 'v1.0',
          performance_score: newState.performance.overallScore,
          weights: newState as any
        });
    } catch (error) {
      console.warn('Failed to save training state to Supabase:', error);
    }
  }, []);

  const updateMetrics = useCallback((updates: Partial<TrainingMetrics>) => {
    const newState: TrainingState = {
      ...state,
      metrics: { ...state.metrics, ...updates },
      lastUpdated: new Date().toISOString()
    };
    saveState(newState);
  }, [state, saveState]);

  const updatePerformance = useCallback((updates: Partial<ModelPerformance>) => {
    const newState: TrainingState = {
      ...state,
      performance: { ...state.performance, ...updates },
      lastUpdated: new Date().toISOString()
    };
    saveState(newState);
  }, [state, saveState]);

  const resetState = useCallback(() => {
    const newState = { ...defaultState, lastUpdated: new Date().toISOString() };
    saveState(newState);
  }, [saveState]);

  return {
    state,
    isLoading,
    updateMetrics,
    updatePerformance,
    resetState,
    saveState
  };
}