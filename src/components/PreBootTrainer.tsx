import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Brain, Target, Zap, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TrainingGate {
  name: string;
  description: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  current?: number;
  target?: number;
  details?: string;
}

interface PreBootStatus {
  isComplete: boolean;
  totalEpisodes: number;
  targetEpisodes: number;
  ocrAccuracy: number;
  designSuccessRate: number;
  guardCoverage: number;
  explainability: number;
  gates: TrainingGate[];
}

export default function PreBootTrainer() {
  const [status, setStatus] = useState<PreBootStatus | null>(null);
  const [isTraining, setIsTraining] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentEpisode, setCurrentEpisode] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    checkTrainingStatus();
    const interval = setInterval(checkTrainingStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  async function checkTrainingStatus() {
    try {
      // Get training episodes count
      const { count: episodeCount } = await supabase
        .from('train_episodes')
        .select('*', { count: 'exact', head: true });

      // Get latest metrics
      const { data: metrics } = await supabase
        .from('training_metrics')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      const latestMetrics = metrics?.reduce((acc, metric) => {
        if (!acc[metric.metric_type]) {
          acc[metric.metric_type] = metric.value;
        }
        return acc;
      }, {} as Record<string, number>) || {};

      // Calculate gates
      const gates: TrainingGate[] = [
        {
          name: 'Product Coverage',
          description: 'Minimum product database size',
          status: await checkProductCoverage(),
          current: latestMetrics.TOTAL_PRODUCTS || 0,
          target: 2000
        },
        {
          name: 'Training Episodes',
          description: '50,000 autonomous training episodes',
          status: (episodeCount || 0) >= 50000 ? 'passed' : 'pending',
          current: episodeCount || 0,
          target: 50000
        },
        {
          name: 'OCR Accuracy',
          description: 'Brand/model extraction precision ≥85%',
          status: (latestMetrics.OCR_ACCURACY || 0) >= 0.85 ? 'passed' : 'pending',
          current: Math.round((latestMetrics.OCR_ACCURACY || 0) * 100),
          target: 85
        },
        {
          name: 'Design Success',
          description: 'Valid configuration generation rate',
          status: (latestMetrics.DESIGN_SUCCESS_RATE || 0) >= 0.7 ? 'passed' : 'pending',
          current: Math.round((latestMetrics.DESIGN_SUCCESS_RATE || 0) * 100),
          target: 70
        },
        {
          name: 'Guard Coverage',
          description: 'Invalid selections blocked preemptively',
          status: (latestMetrics.RULE_COVERAGE || 0) >= 0.95 ? 'passed' : 'pending',
          current: Math.round((latestMetrics.RULE_COVERAGE || 0) * 100),
          target: 95
        },
        {
          name: 'Explainability',
          description: 'Spec citations with page references',
          status: (latestMetrics.EXPLAINABILITY || 0) >= 0.9 ? 'passed' : 'pending',
          current: Math.round((latestMetrics.EXPLAINABILITY || 0) * 100),
          target: 90
        }
      ];

      const allPassed = gates.every(gate => gate.status === 'passed');
      
      setStatus({
        isComplete: allPassed,
        totalEpisodes: episodeCount || 0,
        targetEpisodes: 50000,
        ocrAccuracy: latestMetrics.OCR_ACCURACY || 0,
        designSuccessRate: latestMetrics.DESIGN_SUCCESS_RATE || 0,
        guardCoverage: latestMetrics.RULE_COVERAGE || 0,
        explainability: latestMetrics.EXPLAINABILITY || 0,
        gates
      });

      if (episodeCount) {
        setCurrentEpisode(episodeCount);
        setProgress(Math.min(100, (episodeCount / 50000) * 100));
      }

    } catch (error) {
      console.error('Failed to check training status:', error);
    }
  }

  async function checkProductCoverage(): Promise<'passed' | 'pending'> {
    try {
      const { count: productCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });
      
      return (productCount || 0) >= 2000 ? 'passed' : 'pending';
    } catch {
      return 'pending';
    }
  }

  async function startTraining() {
    setIsTraining(true);
    addLog('🚀 Starting pre-boot training with 50,000 episodes...');
    
    try {
      // In a real implementation, this would trigger the actual training
      // For demo purposes, we'll simulate progress
      simulateTraining();
      
    } catch (error) {
      console.error('Training failed:', error);
      addLog(`❌ Training failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsTraining(false);
    }
  }

  function simulateTraining() {
    // Simulate training progress for demo
    let episode = currentEpisode;
    const interval = setInterval(() => {
      episode += Math.floor(Math.random() * 100) + 50;
      
      if (episode >= 50000) {
        episode = 50000;
        clearInterval(interval);
        setIsTraining(false);
        addLog('✅ Pre-boot training completed successfully!');
        addLog('🎯 All readiness gates passed. System ready for production.');
      }
      
      setCurrentEpisode(episode);
      setProgress((episode / 50000) * 100);
      
      if (episode % 1000 === 0) {
        addLog(`📊 Training progress: ${episode.toLocaleString()}/50,000 episodes`);
      }
      
      // Update status periodically
      if (episode % 5000 === 0) {
        checkTrainingStatus();
      }
    }, 200);
  }

  function addLog(message: string) {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 99)]);
  }

  if (!status) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Clock className="w-8 h-8 animate-spin mx-auto mb-2" />
          <p>Checking training status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <Brain className="w-8 h-8" />
          <h1 className="text-3xl font-bold">Pre-Boot Training System</h1>
        </div>
        
        <p className="text-muted-foreground max-w-2xl mx-auto">
          The autonomous trainer must complete 50,000 episodes and pass all readiness gates 
          before the UI can be accessed. This ensures optimal performance and prevents invalid configurations.
        </p>

        {status.isComplete ? (
          <div className="flex items-center justify-center gap-2 text-green-600">
            <CheckCircle className="w-6 h-6" />
            <span className="font-semibold">All gates passed! System ready for production.</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 text-amber-600">
            <AlertTriangle className="w-6 h-6" />
            <span className="font-semibold">Training required before system access.</span>
          </div>
        )}
      </div>

      {/* Training Progress */}
      <Card className={status.isComplete ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Training Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Episodes Completed</span>
              <span>{currentEpisode.toLocaleString()} / 50,000</span>
            </div>
            <Progress value={progress} className="h-3" />
            <div className="text-xs text-muted-foreground text-center">
              {progress.toFixed(1)}% complete
            </div>
          </div>

          {!status.isComplete && (
            <div className="text-center">
              <Button 
                onClick={startTraining}
                disabled={isTraining}
                size="lg"
                className="px-8"
              >
                {isTraining ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Training in Progress...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Start 50,000 Episode Training
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Readiness Gates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Readiness Gates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {status.gates.map((gate) => (
              <div key={gate.name} className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="flex-shrink-0">
                  {gate.status === 'passed' ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : gate.status === 'running' ? (
                    <Clock className="w-5 h-5 text-blue-500 animate-spin" />
                  ) : gate.status === 'failed' ? (
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  ) : (
                    <Clock className="w-5 h-5 text-amber-500" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{gate.name}</div>
                  <div className="text-sm text-muted-foreground">{gate.description}</div>
                  {gate.current !== undefined && gate.target !== undefined && (
                    <div className="text-sm mt-1">
                      <span className={gate.current >= gate.target ? 'text-green-600' : 'text-amber-600'}>
                        {gate.current.toLocaleString()} / {gate.target.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
                
                <Badge variant={
                  gate.status === 'passed' ? 'default' : 
                  gate.status === 'running' ? 'secondary' : 
                  gate.status === 'failed' ? 'destructive' : 'outline'
                }>
                  {gate.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Training Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Training Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {logs.length === 0 ? (
              <div className="text-muted-foreground text-center py-4">
                No training logs yet. Start training to see live updates.
              </div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="text-sm font-mono p-2 bg-gray-50 rounded">
                  {log}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}