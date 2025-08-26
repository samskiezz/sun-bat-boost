import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Brain, Target, TrendingUp, Zap, Activity, Award, AlertTriangle, CheckCircle, Clock, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { PDFProposalUploader } from '@/components/PDFProposalUploader';

interface TrainingMetric {
  name: string;
  value: number;
  metadata?: any;
  created_at: string;
}

interface TrainingStatus {
  currentEpisodes: number;
  targetEpisodes: number;
  recentMetrics: TrainingMetric[];
}

export default function ComprehensiveTrainingDashboard() {
  const [status, setStatus] = useState<TrainingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTraining, setIsTraining] = useState(false);
  const [episodes, setEpisodes] = useState(50000);
  const { toast } = useToast();

  useEffect(() => {
    loadTrainingStatus();
    const interval = setInterval(loadTrainingStatus, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  async function loadTrainingStatus() {
    try {
      const { data, error } = await supabase.functions.invoke('preboot-trainer', {
        body: { action: 'get_training_status' }
      });

      if (error) throw error;
      setStatus(data);
    } catch (error) {
      console.error('Failed to load training status:', error);
    } finally {
      setLoading(false);
    }
  }

  async function startTraining() {
    setIsTraining(true);
    try {
      const { data, error } = await supabase.functions.invoke('preboot-trainer', {
        body: { 
          action: 'start_training',
          episodes,
          batchSize: 1000 
        }
      });

      if (error) throw error;

      toast({
        title: "Training Started",
        description: `Starting ${episodes.toLocaleString()} episode training run`,
      });

      // Refresh status
      setTimeout(loadTrainingStatus, 2000);

    } catch (error: any) {
      console.error('Training failed:', error);
      toast({
        title: "Training Failed",
        description: error.message || "Failed to start training",
        variant: "destructive",
      });
    } finally {
      setIsTraining(false);
    }
  }

  async function checkReadiness() {
    try {
      const { data, error } = await supabase.functions.invoke('preboot-trainer', {
        body: { action: 'check_readiness' }
      });

      if (error) throw error;

      toast({
        title: "Readiness Check",
        description: data.allPassing ? "All gates passing!" : "Some gates need attention",
        variant: data.allPassing ? "default" : "destructive",
      });

    } catch (error: any) {
      console.error('Readiness check failed:', error);
      toast({
        title: "Check Failed",
        description: error.message || "Failed to check readiness",
        variant: "destructive",
      });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="w-8 h-8 animate-spin mx-auto mb-2" />
          <p>Loading training dashboard...</p>
        </div>
      </div>
    );
  }

  const progressPercentage = status ? Math.min(100, (status.currentEpisodes / status.targetEpisodes) * 100) : 0;
  const isComplete = status ? status.currentEpisodes >= status.targetEpisodes : false;

  // Process metrics for charts
  const ocrMetrics = status?.recentMetrics.filter(m => m.name === 'ocr_accuracy_batch') || [];
  const designMetrics = status?.recentMetrics.filter(m => m.name === 'design_pass_rate_batch') || [];

  const chartData = ocrMetrics.slice(-10).map((metric, index) => ({
    episode: index + 1,
    ocrAccuracy: metric.value * 100,
    designSuccess: (designMetrics[index]?.value || 0) * 100
  }));

  return (
    <div className="space-y-6">
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="dashboard">Training Dashboard</TabsTrigger>
          <TabsTrigger value="pdf-upload" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            PDF Proposals
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard" className="space-y-6 mt-6">
          <Card className={isComplete ? "border-green-200 bg-green-50" : "border-blue-200 bg-blue-50"}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-6 h-6" />
                Autonomous Training System (50,000 Episodes)
                {isComplete && <CheckCircle className="w-5 h-5 text-green-600 ml-auto" />}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4">
                <Brain className="h-4 w-4" />
                <AlertDescription>
                  The system must complete 50,000 autonomous training episodes before first use. 
                  Each episode generates synthetic proposals, tests OCR extraction, validates designs, and learns from failures.
                </AlertDescription>
              </Alert>

              {status && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold">Training Progress</span>
                    <span className="font-mono text-xl">
                      {status.currentEpisodes.toLocaleString()} / {status.targetEpisodes.toLocaleString()}
                    </span>
                  </div>

                  <Progress value={progressPercentage} className="h-4" />

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {progressPercentage.toFixed(1)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Complete</div>
                    </div>

                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {status.currentEpisodes.toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">Episodes</div>
                    </div>

                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {ocrMetrics.length > 0 ? (ocrMetrics[ocrMetrics.length - 1].value * 100).toFixed(1) : '0.0'}%
                      </div>
                      <div className="text-sm text-muted-foreground">OCR Accuracy</div>
                    </div>

                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {designMetrics.length > 0 ? (designMetrics[designMetrics.length - 1].value * 100).toFixed(1) : '0.0'}%
                      </div>
                      <div className="text-sm text-muted-foreground">Design Success</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Training Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="episode" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, '']} />
                      <Line 
                        type="monotone" 
                        dataKey="ocrAccuracy" 
                        stroke="#8884d8" 
                        name="OCR Accuracy" 
                        strokeWidth={2}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="designSuccess" 
                        stroke="#82ca9d" 
                        name="Design Success" 
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No training data available yet</p>
                      <p className="text-sm">Start training to see performance metrics</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Recent Batch Rewards
                </CardTitle>
              </CardHeader>
              <CardContent>
                {status?.recentMetrics.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={status.recentMetrics.slice(-10).map((metric, i) => ({
                      batch: i + 1,
                      reward: metric.value * 100
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="batch" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="reward" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Award className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No reward data available</p>
                      <p className="text-sm">Training will generate reward metrics</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Training Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium">Training Episodes</label>
                  <input
                    type="number"
                    value={episodes}
                    onChange={(e) => setEpisodes(parseInt(e.target.value) || 50000)}
                    className="w-full px-3 py-2 border rounded-md mt-1"
                    min="1000"
                    max="100000"
                    step="1000"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={startTraining}
                  disabled={isTraining || isComplete}
                  className="flex items-center gap-2"
                >
                  {isTraining ? (
                    <>
                      <Clock className="w-4 h-4 animate-spin" />
                      Training in Progress...
                    </>
                  ) : isComplete ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Training Complete
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Start Training ({episodes.toLocaleString()} episodes)
                    </>
                  )}
                </Button>

                <Button 
                  onClick={checkReadiness}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Target className="w-4 h-4" />
                  Check Readiness Gates
                </Button>

                <Button 
                  onClick={loadTrainingStatus}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Activity className="w-4 h-4" />
                  Refresh Status
                </Button>
              </div>

              {isComplete && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    🎉 Training complete! The system has finished {status?.currentEpisodes.toLocaleString()} episodes 
                    and is ready for production use. All readiness gates should now be passing.
                  </AlertDescription>
                </Alert>
              )}

              {status && status.currentEpisodes > 0 && !isComplete && (
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    Training in progress: {status.currentEpisodes.toLocaleString()} episodes completed. 
                    The system will continue learning and improving OCR accuracy and design validation.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Training Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium">OCR Training</div>
                  <div className="text-xs text-muted-foreground">
                    • Synthetic proposal generation<br/>
                    • OCR noise injection (ligatures, substitutions)<br/>
                    • Brand/model recognition<br/>
                    • Quantity extraction<br/>
                    • Specification parsing
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Design Validation</div>
                  <div className="text-xs text-muted-foreground">
                    • DC:AC ratio optimization<br/>
                    • MPPT voltage window checks<br/>
                    • Battery compatibility rules<br/>
                    • String configuration validation<br/>
                    • Phase matching verification
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Learning Outcomes</div>
                  <div className="text-xs text-muted-foreground">
                    • Improved alias recognition<br/>
                    • Enhanced regex patterns<br/>
                    • UI constraint synthesis<br/>
                    • Rule coverage optimization<br/>
                    • Explainability anchoring
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="pdf-upload" className="mt-6">
          <PDFProposalUploader />
        </TabsContent>
      </Tabs>
    </div>
  );
}