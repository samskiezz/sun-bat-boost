// Meta-Controller for AI Model Selection and Pipeline Orchestration
// Contextual bandit that chooses optimal processing pipeline based on context

import { messageBus, type MessageTypes } from './MessageBus';
import { modelRegistry } from './ModelRegistry';
import type { AccuracyMode } from '@/components/AccuracyToggle';

interface PipelineConfig {
  mode: 'preview_fast' | 'standard' | 'exact';
  models: string[];
  maxLatency: number;
  expectedAccuracy: number;
}

interface ContextualFeatures {
  docSize: number;
  missingFields: number;
  deviceType: 'mobile' | 'desktop';
  userTier: 'free' | 'lite' | 'pro';
  accuracyMode: AccuracyMode;
}

export class MetaController {
  private pipelines: Map<string, PipelineConfig> = new Map();
  private banditWeights: Map<string, number> = new Map();
  private rewardHistory: Array<{ features: ContextualFeatures; pipeline: string; reward: number }> = [];

  constructor() {
    this.initializePipelines();
    this.loadBanditWeights();
    this.subscribeToBus();
  }

  private initializePipelines() {
    // Define available processing pipelines
    this.pipelines.set('preview_fast', {
      mode: 'preview_fast',
      models: ['M10', 'M11'], // ROI Preview + Confidence Calibrator
      maxLatency: 200,
      expectedAccuracy: 0.75
    });

    this.pipelines.set('standard', {
      mode: 'standard',
      models: ['M1', 'M2', 'M4', 'M7', 'M8', 'M11'], // Full RL dispatch pipeline
      maxLatency: 2000,
      expectedAccuracy: 0.90
    });

    this.pipelines.set('exact', {
      mode: 'exact',
      models: ['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M14', 'M15'], // MILP + forecasting
      maxLatency: 15000,
      expectedAccuracy: 0.98
    });
  }

  private loadBanditWeights() {
    // Initialize contextual bandit weights
    this.pipelines.forEach((_, pipeline) => {
      this.banditWeights.set(pipeline, 0.5); // Start with neutral weights
    });

    // Load from localStorage if available
    try {
      const saved = localStorage.getItem('meta.controller.weights');
      if (saved) {
        const weights = JSON.parse(saved);
        Object.entries(weights).forEach(([pipeline, weight]) => {
          this.banditWeights.set(pipeline, weight as number);
        });
      }
    } catch (error) {
      console.warn('Failed to load bandit weights:', error);
    }
  }

  private subscribeToBus() {
    // Listen for user actions to trigger pipeline selection
    messageBus.subscribe('user.action', (message) => {
      if (message.value.action === 'calculation_started') {
        this.selectPipeline(message.value.context || {});
      }
    });

    // Listen for accuracy mode changes
    messageBus.subscribe('accuracy.mode', (message) => {
      this.handleAccuracyModeChange(message.value.mode);
    });
  }

  private extractFeatures(context: any = {}): ContextualFeatures {
    return {
      docSize: context.docSize || 0,
      missingFields: context.missingFields || 0,
      deviceType: window.innerWidth < 768 ? 'mobile' : 'desktop',
      userTier: context.userTier || 'free',
      accuracyMode: context.accuracyMode || 'auto'
    };
  }

  private calculatePipelineScore(pipeline: PipelineConfig, features: ContextualFeatures): number {
    let score = this.banditWeights.get(pipeline.mode) || 0.5;

    // Feature-based adjustments
    if (features.deviceType === 'mobile' && pipeline.maxLatency > 5000) {
      score -= 0.3; // Penalize high-latency pipelines on mobile
    }

    if (features.userTier === 'free' && pipeline.mode === 'exact') {
      score -= 0.5; // Limit exact mode for free users
    }

    if (features.accuracyMode === 'preview' && pipeline.mode !== 'preview_fast') {
      score -= 0.4; // Prefer fast pipeline in preview mode
    }

    if (features.accuracyMode === 'exact' && pipeline.mode !== 'exact') {
      score -= 0.6; // Strongly prefer exact pipeline in exact mode
    }

    // Exploration bonus (epsilon-greedy)
    score += Math.random() * 0.1;

    return Math.max(0, Math.min(1, score));
  }

  public selectPipeline(context: any = {}): string {
    const features = this.extractFeatures(context);
    
    // If accuracy mode is not 'auto', force specific pipeline
    if (features.accuracyMode !== 'auto') {
      const modeMapping: Record<AccuracyMode, string> = {
        'auto': 'standard',
        'preview': 'preview_fast',
        'standard': 'standard',
        'exact': 'exact'
      };
      
      const selectedPipeline = modeMapping[features.accuracyMode];
      
      messageBus.publish('pipeline.selected', 
        { pipeline: selectedPipeline, features, mode: 'forced' },
        1.0,
        { model_id: 'MetaController', version: '1.0.0' }
      );
      
      return selectedPipeline;
    }

    // Auto mode - use contextual bandit
    let bestPipeline = 'standard';
    let bestScore = -1;

    this.pipelines.forEach((config, name) => {
      const score = this.calculatePipelineScore(config, features);
      if (score > bestScore) {
        bestScore = score;
        bestPipeline = name;
      }
    });

    messageBus.publish('pipeline.selected', 
      { pipeline: bestPipeline, features, mode: 'auto', score: bestScore },
      0.8,
      { model_id: 'MetaController', version: '1.0.0' }
    );

    return bestPipeline;
  }

  private handleAccuracyModeChange(mode: AccuracyMode) {
    // Update UI or components based on accuracy mode
    if (mode === 'auto') {
      // Meta-controller will choose pipeline dynamically
      console.log('Meta-controller active for pipeline selection');
    } else {
      console.log(`Accuracy mode set to: ${mode}`);
    }
  }

  public recordReward(pipeline: string, features: ContextualFeatures, reward: number) {
    // Record reward for bandit learning
    this.rewardHistory.push({ features, pipeline, reward });
    
    // Update bandit weights using simple moving average
    const currentWeight = this.banditWeights.get(pipeline) || 0.5;
    const learningRate = 0.1;
    const newWeight = currentWeight + learningRate * (reward - currentWeight);
    
    this.banditWeights.set(pipeline, Math.max(0, Math.min(1, newWeight)));
    
    // Persist weights
    this.saveBanditWeights();
    
    // Limit history size
    if (this.rewardHistory.length > 1000) {
      this.rewardHistory = this.rewardHistory.slice(-500);
    }
  }

  private saveBanditWeights() {
    try {
      const weights = Object.fromEntries(this.banditWeights);
      localStorage.setItem('meta.controller.weights', JSON.stringify(weights));
    } catch (error) {
      console.warn('Failed to save bandit weights:', error);
    }
  }

  public getStats() {
    return {
      pipelines: Array.from(this.pipelines.keys()),
      weights: Object.fromEntries(this.banditWeights),
      rewardHistory: this.rewardHistory.length,
      averageReward: this.rewardHistory.length > 0 
        ? this.rewardHistory.reduce((sum, r) => sum + r.reward, 0) / this.rewardHistory.length 
        : 0
    };
  }
}

// Global meta-controller instance
export const metaController = new MetaController();