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

interface PerFunctionProgress {
  lastTrained: string;
  episodesAdded: number;
  recentMetric: number;
}

interface TrainingState {
  metrics: TrainingMetrics;
  performance: ModelPerformance;
  perFunction: Record<string, PerFunctionProgress>;
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
  perFunction: {},
  lastUpdated: new Date().toISOString()
};

export function getCurrentWeights() {
  try { 
    const raw = localStorage.getItem('advanced_training_state'); 
    return raw ? JSON.parse(raw) : null; 
  }
  catch { 
    return null; 
  }
}

export function useTrainingState() {
  const [state, setState] = useState<TrainingState>(defaultState);
  const [isLoading, setIsLoading] = useState(true);

  // Load state on mount
  useEffect(() => {
    loadState();
  }, []);

  const loadState = useCallback(async () => {
    try {
      // Try to load from Supabase first with resilient read
      const { data, error } = await supabase
        .from(SUPABASE_TABLE)
        .select('*')
        .eq('model_type', 'advanced_training_system')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let remoteState: TrainingState | null = null;
      if (!error && data?.weights) {
        try {
          remoteState = data.weights as unknown as TrainingState;
        } catch (parseError) {
          console.warn('Failed to parse Supabase state:', parseError);
        }
      }

      // Also try localStorage
      let localState: TrainingState | null = null;
      const localData = localStorage.getItem(STORAGE_KEY);
      if (localData) {
        try {
          localState = JSON.parse(localData);
        } catch (parseError) {
          console.warn('Failed to parse local state:', parseError);
        }
      }

      // Merge remote and local, picking the fresher one
      let finalState: TrainingState;
      if (remoteState && localState) {
        const remoteTime = new Date(remoteState.lastUpdated).getTime();
        const localTime = new Date(localState.lastUpdated).getTime();
        finalState = remoteTime > localTime ? remoteState : localState;
      } else if (remoteState) {
        finalState = remoteState;
      } else if (localState) {
        finalState = localState;
      } else {
        finalState = defaultState;
      }

      // Ensure perFunction exists for backward compatibility
      if (!finalState.perFunction) {
        finalState.perFunction = {};
      }

      setState(finalState);
      // Save winner back to both caches
      localStorage.setItem(STORAGE_KEY, JSON.stringify(finalState));
      
    } catch (error) {
      console.warn('Failed to load training state:', error);
      setState(defaultState);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveState = useCallback(async (newState: TrainingState) => {
    setState(newState);
    
    // Save to localStorage immediately for fast access
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));

    // Robust Supabase save with fallback
    try {
      // Try upsert with onConflict first (best-effort)
      await supabase
        .from(SUPABASE_TABLE)
        .upsert({
          model_type: 'advanced_training_system',
          version: 'v1.0', 
          performance_score: newState.performance.overallScore,
          weights: newState as any
        }, { 
          onConflict: 'model_type' 
        });
    } catch (upsertError) {
      console.warn('Upsert failed, trying insert-or-update:', upsertError);
      
      // Fallback to two-step insert-or-update
      try {
        const { data: existing } = await supabase
          .from(SUPABASE_TABLE)
          .select('id')
          .eq('model_type', 'advanced_training_system')
          .maybeSingle();

        if (existing?.id) {
          // Update existing row
          await supabase
            .from(SUPABASE_TABLE)
            .update({
              version: 'v1.0',
              performance_score: newState.performance.overallScore,
              weights: newState as any
            })
            .eq('id', existing.id);
        } else {
          // Insert new row
          await supabase
            .from(SUPABASE_TABLE)
            .insert({
              model_type: 'advanced_training_system',
              version: 'v1.0',
              performance_score: newState.performance.overallScore,
              weights: newState as any
            });
        }
      } catch (fallbackError) {
        console.warn('Failed to save training state to Supabase (all methods):', fallbackError);
      }
    }
  }, []);

  const updateMetrics = useCallback((updates: Partial<TrainingMetrics> | ((current: TrainingMetrics) => Partial<TrainingMetrics>)) => {
    setState(currentState => {
      const updatesObj = typeof updates === 'function' ? updates(currentState.metrics) : updates;
      const newState: TrainingState = {
        ...currentState,
        metrics: { ...currentState.metrics, ...updatesObj },
        lastUpdated: new Date().toISOString()
      };
      saveState(newState);
      return newState;
    });
  }, [saveState]);

  const updatePerformance = useCallback((updates: Partial<ModelPerformance> | ((current: ModelPerformance) => Partial<ModelPerformance>)) => {
    setState(currentState => {
      const updatesObj = typeof updates === 'function' ? updates(currentState.performance) : updates;
      const newState: TrainingState = {
        ...currentState,
        performance: { ...currentState.performance, ...updatesObj },
        lastUpdated: new Date().toISOString()
      };
      saveState(newState);
      return newState;
    });
  }, [saveState]);

  const updateFunctionProgress = useCallback((functionName: string, episodesAdded: number, recentMetric: number) => {
    setState(currentState => {
      const newState: TrainingState = {
        ...currentState,
        perFunction: {
          ...currentState.perFunction,
          [functionName]: {
            lastTrained: new Date().toISOString(),
            episodesAdded,
            recentMetric
          }
        },
        lastUpdated: new Date().toISOString()
      };
      saveState(newState);
      return newState;
    });
  }, [saveState]);

  const resetState = useCallback(() => {
    const newState = { ...defaultState, lastUpdated: new Date().toISOString() };
    saveState(newState);
  }, [saveState]);

  return {
    state,
    isLoading,
    updateMetrics,
    updatePerformance,
    updateFunctionProgress,
    resetState,
    saveState
  };
}