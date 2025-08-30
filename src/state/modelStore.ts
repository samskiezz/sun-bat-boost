// Model state management store
import { create } from 'zustand';
import { PredictionResult } from '@/lib/modelClient';

interface ModelState {
  // Last good results for fallback
  lastGoodResults: {
    [task: string]: PredictionResult;
  };
  
  // Service status
  serviceStatus: {
    available: boolean;
    models: Record<string, boolean>;
    versions: Record<string, string>;
    lastChecked: Date | null;
  };
  
  // Admin training state
  isTraining: boolean;
  trainingTask: string | null;
  trainingProgress: number;
  trainingError: string | null;
  
  // Actions
  setLastGoodResult: (task: string, result: PredictionResult) => void;
  updateServiceStatus: (status: any) => void;
  setTrainingState: (isTraining: boolean, task?: string, progress?: number, error?: string) => void;
  clearTrainingState: () => void;
}

export const useModelStore = create<ModelState>((set, get) => ({
  lastGoodResults: {},
  serviceStatus: {
    available: false,
    models: {},
    versions: {},
    lastChecked: null
  },
  isTraining: false,
  trainingTask: null,
  trainingProgress: 0,
  trainingError: null,
  
  setLastGoodResult: (task, result) => 
    set((state) => ({
      lastGoodResults: {
        ...state.lastGoodResults,
        [task]: result
      }
    })),
  
  updateServiceStatus: (status) =>
    set({
      serviceStatus: {
        available: status.status === 'ready',
        models: status.models || {},
        versions: status.versions || {},
        lastChecked: new Date()
      }
    }),
  
  setTrainingState: (isTraining, task, progress = 0, error = null) =>
    set({
      isTraining,
      trainingTask: task || null,
      trainingProgress: progress,
      trainingError: error
    }),
  
  clearTrainingState: () =>
    set({
      isTraining: false,
      trainingTask: null,
      trainingProgress: 0,
      trainingError: null
    })
}));