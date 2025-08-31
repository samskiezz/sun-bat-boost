import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Brain, Zap, Target, Activity } from 'lucide-react';
import { useTrainingImpact } from '@/hooks/useTrainingImpact';

export default function FunctionImpactDashboard() {
  const impact = useTrainingImpact();

  if (!impact.isReady) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">Loading function impacts...</div>
        </CardContent>
      </Card>
    );
  }

  const { functionImpacts, totalFunctionsTrained } = impact;

  return (
    <div className="space-y-4">
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Function Impact Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{totalFunctionsTrained}</div>
              <div className="text-sm text-muted-foreground">Functions Trained</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">
                {((impact.sizingConfidenceBoost - 1) * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Sizing Boost</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">
                {((impact.savingsPrecisionBoost - 1) * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Precision Boost</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-500">
                {(impact.planRankingConfidence * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Plan Confidence</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {Object.keys(functionImpacts).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Per-Function Performance Impact</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(functionImpacts).map(([functionName, impact]) => (
                <div key={functionName} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      <span className="font-medium text-sm">{functionName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {impact.episodes.toLocaleString()} episodes
                      </Badge>
                      {impact.lastTrained && (
                        <Badge variant="secondary" className="text-xs">
                          {new Date(impact.lastTrained).toLocaleDateString()}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Accuracy</span>
                        <span>{impact.accuracy.toFixed(1)}%</span>
                      </div>
                      <Progress value={impact.accuracy} className="h-2" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Efficiency</span>
                        <span>{impact.efficiency.toFixed(1)}%</span>
                      </div>
                      <Progress value={impact.efficiency} className="h-2" />
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    Performance impact based on training episodes and model accuracy
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            System-Wide Improvements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Solar Sizing Confidence</span>
                <span className="text-sm font-medium">
                  {((impact.sizingConfidenceBoost - 1) * 100).toFixed(1)}% boost
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                More accurate system sizing recommendations based on trained ML functions
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Savings Precision</span>
                <span className="text-sm font-medium">
                  {((impact.savingsPrecisionBoost - 1) * 100).toFixed(1)}% boost
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                Enhanced accuracy in predicting customer savings and ROI
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">ROI Calibration</span>
                <span className="text-sm font-medium">
                  {((impact.roiCalibration - 1) * 100).toFixed(1)}% improvement
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                Better calibration of return on investment calculations
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Plan Ranking Confidence</span>
                <span className="text-sm font-medium">
                  {(impact.planRankingConfidence * 100).toFixed(1)}%
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                Confidence level in energy plan ranking algorithms
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}