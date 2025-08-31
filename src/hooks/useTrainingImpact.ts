import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FunctionImpact {
  accuracy: number;
  efficiency: number;
  episodes: number;
  lastTrained?: string;
}

interface TrainingImpact {
  sizingConfidenceBoost: number;
  savingsPrecisionBoost: number;
  roiCalibration: number;
  planRankingConfidence: number;
  overallScore: number;
  isReady: boolean;
  functionImpacts: Record<string, FunctionImpact>;
  totalFunctionsTrained: number;
}

const defaultImpact: TrainingImpact = {
  sizingConfidenceBoost: 1.0,
  savingsPrecisionBoost: 1.0,
  roiCalibration: 1.0,
  planRankingConfidence: 0.0,
  overallScore: 0,
  isReady: true,
  functionImpacts: {},
  totalFunctionsTrained: 0
};

export function useTrainingImpact() {
  const [impact, setImpact] = useState<TrainingImpact>(defaultImpact);

  useEffect(() => {
    const loadTrainingImpact = async () => {
      try {
        const { data, error } = await supabase
          .from('ai_model_weights')
          .select('*')
          .eq('model_type', 'advanced_training_system')
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();

        // Get advanced training system data
        const { data: allWeights, error: weightsError } = await supabase
          .from('ai_model_weights')
          .select('*')
          .order('updated_at', { ascending: false });

        if (!error && data?.weights) {
          const weights = data.weights as any;
          const performance = weights.performance || {};
          const metrics = weights.metrics || {};
          
          // Calculate bounded tuning factors based on training performance
          const overallScore = performance.overallScore || 0;
          const convergence = metrics.convergence || 0;
          const accuracy = metrics.accuracy || 0;
          
          // All adjustments are conservative and bounded to avoid unrealistic outputs
          const sizingConfidenceBoost = Math.min(1.0 + (overallScore * 0.002), 1.15); // Max 15% boost
          const savingsPrecisionBoost = Math.min(1.0 + (accuracy * 0.0015), 1.12); // Max 12% boost  
          const roiCalibration = Math.min(1.0 + (convergence * 0.001), 1.08); // Max 8% boost
          const planRankingConfidence = Math.min(0.85 + (overallScore * 0.0025), 0.95); // Max 95% confidence
          
          // Process per-function impacts from all weights
          const functionImpacts: Record<string, FunctionImpact> = {};
          let totalFunctionsTrained = 0;
          
          if (allWeights && !weightsError) {
            for (const weight of allWeights) {
              const weightData = weight.weights as any;
              if (weightData.function_name) {
                functionImpacts[weightData.function_name] = {
                  accuracy: weightData.accuracy || 0,
                  efficiency: weightData.efficiency || 0,
                  episodes: weightData.episodes || 0,
                  lastTrained: weightData.last_trained
                };
                totalFunctionsTrained++;
              }
            }
          }
          
          setImpact({
            sizingConfidenceBoost,
            savingsPrecisionBoost, 
            roiCalibration,
            planRankingConfidence,
            overallScore,
            isReady: true,
            functionImpacts,
            totalFunctionsTrained
          });

          if (totalFunctionsTrained > 0) {
            console.log('🤖 Training impact calculated:', {
              sizingConfidenceBoost: `${((sizingConfidenceBoost - 1) * 100).toFixed(1)}%`,
              savingsPrecisionBoost: `${((savingsPrecisionBoost - 1) * 100).toFixed(1)}%`,
              roiCalibration: `${((roiCalibration - 1) * 100).toFixed(1)}%`,
              planRankingConfidence: `${(planRankingConfidence * 100).toFixed(1)}%`,
              overallScore: `${overallScore.toFixed(1)}%`,
              functionsActive: `${totalFunctionsTrained} functions trained`
            });
          }
        }
      } catch (error) {
        console.warn('Failed to load training impact:', error);
      }
    };

    loadTrainingImpact();
  }, []);

  return impact;
}