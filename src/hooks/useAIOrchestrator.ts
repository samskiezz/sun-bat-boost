// React hook for AI Orchestrator integration

import { useEffect, useState, useCallback } from 'react';
import { messageBus, type MessageTypes } from '@/lib/ai/MessageBus';
import { modelRegistry } from '@/lib/ai/ModelRegistry';
import { metaController } from '@/lib/ai/MetaController';
import { dataFirewall } from '@/lib/ai/DataFirewall';
import { getFeatureFlags, type FeatureFlags } from '@/lib/ai/FeatureFlags';
import type { AccuracyMode } from '@/components/AccuracyToggle';

export interface AIOrchestrator {
  // Message bus methods
  publish: typeof messageBus.publish;
  subscribe: typeof messageBus.subscribe;
  
  // Pipeline control
  selectPipeline: (context?: any) => string;
  
  // Model management
  getModelStats: () => any;
  
  // Data validation
  validateData: (context: string, data: any) => any[];
  
  // Feature flags
  features: FeatureFlags;
  
  // Status
  isReady: boolean;
  accuracyMode: AccuracyMode;
}

interface UseAIOrchestratorProps {
  userTier: 'free' | 'lite' | 'pro';
  devMode?: boolean;
  accuracyMode?: AccuracyMode;
}

export function useAIOrchestrator({ 
  userTier, 
  devMode = false, 
  accuracyMode = 'auto' 
}: UseAIOrchestratorProps): AIOrchestrator {
  const [isReady, setIsReady] = useState(false);
  const [currentAccuracyMode, setCurrentAccuracyMode] = useState<AccuracyMode>(accuracyMode);
  
  const features = getFeatureFlags(userTier, devMode);

  useEffect(() => {
    // Initialize AI orchestrator
    const initializeOrchestrator = async () => {
      try {
        // Load essential models based on tier
        const modelsToLoad = userTier === 'free' ? ['M10', 'M11'] : // Preview only
                           userTier === 'lite' ? ['M1', 'M2', 'M4', 'M7', 'M10', 'M11'] : // Standard
                           modelRegistry.getAllModels().map(m => m.id); // All models for Pro

        const loadPromises = modelsToLoad.map(id => modelRegistry.loadModel(id));
        await Promise.all(loadPromises);

        setIsReady(true);
      } catch (error) {
        console.error('Failed to initialize AI orchestrator:', error);
      }
    };

    if (features.aiOrchestrator) {
      initializeOrchestrator();
    } else {
      setIsReady(false);
    }
  }, [userTier, devMode, features.aiOrchestrator]);

  useEffect(() => {
    // Subscribe to accuracy mode changes
    const unsubscribe = messageBus.subscribe('accuracy.mode', (message) => {
      setCurrentAccuracyMode(message.value.mode);
    });

    return unsubscribe;
  }, []);

  const publish = useCallback(<K extends keyof MessageTypes>(
    type: K,
    value: MessageTypes[K],
    confidence: number,
    provenance: { model_id: string; version: string },
    intervals?: { lo: number; hi: number }
  ) => {
    if (!features.aiOrchestrator) {
      console.warn('AI Orchestrator not available for current tier');
      return;
    }
    
    messageBus.publish(type, value, confidence, provenance, intervals);
  }, [features.aiOrchestrator]);

  const subscribe = useCallback(<K extends keyof MessageTypes>(
    type: K,
    handler: (message: any) => void
  ) => {
    if (!features.aiOrchestrator) {
      return () => {}; // No-op unsubscribe
    }
    
    return messageBus.subscribe(type, handler);
  }, [features.aiOrchestrator]);

  const selectPipeline = useCallback((context: any = {}) => {
    if (!features.aiOrchestrator) {
      return 'standard'; // Default fallback
    }
    
    return metaController.selectPipeline({
      ...context,
      userTier,
      accuracyMode: currentAccuracyMode
    });
  }, [features.aiOrchestrator, userTier, currentAccuracyMode]);

  const getModelStats = useCallback(() => {
    if (!features.aiOrchestrator) {
      return { totalModels: 0, loadedModels: 0, averageAccuracy: 0 };
    }
    
    return modelRegistry.getStats();
  }, [features.aiOrchestrator]);

  const validateData = useCallback((context: string, data: any) => {
    if (!features.aiOrchestrator) {
      return []; // No validation for free tier
    }
    
    return dataFirewall.validateData(context, data);
  }, [features.aiOrchestrator]);

  return {
    publish,
    subscribe,
    selectPipeline,
    getModelStats,
    validateData,
    features,
    isReady: isReady && features.aiOrchestrator,
    accuracyMode: currentAccuracyMode
  };
}