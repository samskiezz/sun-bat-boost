import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Brain, Target, Shield, TrendingUp, AlertTriangle, Zap, Activity, Award } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TrainingMetric {
  id: string;
  metric_type: string;
  value: number;
  metadata?: any;
  created_at: string;
}

interface DashboardStats {
  ocrAccuracy: number;
  designSuccessRate: number;
  ruleCoverage: number;
  systemHealth: number;
  totalEpisodes: number;
  activeConstraints: number;
  recentRewards: number[];
  performanceTrend: Array<{ date: string; accuracy: number; success: number }>;
}

export default function TrainingDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'24h' | '7d' | '30d'>('7d');

  useEffect(() => {
    loadDashboardStats();
    const interval = setInterval(loadDashboardStats, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [selectedTimeframe]);

  async function loadDashboardStats() {
    try {
      const timeframeHours = selectedTimeframe === '24h' ? 24 : selectedTimeframe === '7d' ? 168 : 720;
      const since = new Date(Date.now() - timeframeHours * 60 * 60 * 1000).toISOString();

      // Load recent metrics
      const { data: metrics } = await supabase
        .from('training_metrics')
        .select('*')
        .gte('created_at', since)
        .order('created_at', { ascending: false });

      // Load episodes
      const { data: episodes } = await supabase
        .from('train_episodes')
        .select('mode, reward, created_at')
        .gte('created_at', since)
        .order('created_at', { ascending: false });

      // Load constraints
      const { count: constraintCount } = await supabase
        .from('ui_constraints')
        .select('*', { count: 'exact', head: true })
        .eq('enabled', true);

      if (metrics && episodes) {
        const processedStats = processMetrics(metrics, episodes, constraintCount || 0);
        setStats(processedStats);
      }
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  }

  function processMetrics(metrics: TrainingMetric[], episodes: any[], constraintCount: number): DashboardStats {
    const latestMetrics = getLatestMetrics(metrics);
    
    const ocrEpisodes = episodes.filter(e => e.mode === 'OCR');
    const designEpisodes = episodes.filter(e => e.mode === 'DESIGN');
    
    const ocrAccuracy = latestMetrics.OCR_ACCURACY || 0;
    const designSuccessRate = latestMetrics.DESIGN_SUCCESS_RATE || 0;
    const ruleCoverage = latestMetrics.RULE_COVERAGE || 0;
    const systemHealth = latestMetrics.SYSTEM_HEALTH || 0;

    const recentRewards = episodes.slice(0, 20).map(e => e.reward);
    
    // Generate performance trend (simplified)
    const performanceTrend = generatePerformanceTrend(metrics);

    return {
      ocrAccuracy,
      designSuccessRate,
      ruleCoverage,
      systemHealth,
      totalEpisodes: episodes.length,
      activeConstraints: constraintCount,
      recentRewards,
      performanceTrend
    };
  }

  function getLatestMetrics(metrics: TrainingMetric[]): Record<string, number> {
    const latest: Record<string, number> = {};
    
    for (const metric of metrics) {
      if (!latest[metric.metric_type]) {
        latest[metric.metric_type] = metric.value;
      }
    }
    
    return latest;
  }

  function generatePerformanceTrend(metrics: TrainingMetric[]) {
    // Group metrics by day and calculate averages
    const dailyStats: Record<string, { accuracy: number[]; success: number[] }> = {};
    
    for (const metric of metrics) {
      const date = new Date(metric.created_at).toDateString();
      if (!dailyStats[date]) {
        dailyStats[date] = { accuracy: [], success: [] };
      }
      
      if (metric.metric_type === 'OCR_ACCURACY') {
        dailyStats[date].accuracy.push(metric.value);
      } else if (metric.metric_type === 'DESIGN_SUCCESS_RATE') {
        dailyStats[date].success.push(metric.value);
      }
    }
    
    return Object.entries(dailyStats)
      .slice(0, 7)
      .map(([date, values]) => ({
        date: new Date(date).toLocaleDateString(),
        accuracy: values.accuracy.length > 0 ? values.accuracy.reduce((a, b) => a + b) / values.accuracy.length : 0,
        success: values.success.length > 0 ? values.success.reduce((a, b) => a + b) / values.success.length : 0
      }))
      .reverse();
  }

  async function runTrainingBatch() {
    try {
      setLoading(true);
      // In a real implementation, this would trigger the background trainer
      console.log('🚀 Triggering training batch...');
      
      // Simulate training batch
      setTimeout(() => {
        loadDashboardStats();
      }, 2000);
    } catch (error) {
      console.error('Failed to run training batch:', error);
    }
  }

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="w-8 h-8 animate-spin mx-auto mb-2" />
          <p>Loading training dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="w-6 h-6" />
            Training Dashboard
          </h2>
          <p className="text-muted-foreground">Autonomous background trainer performance</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Tabs value={selectedTimeframe} onValueChange={(v) => setSelectedTimeframe(v as any)}>
            <TabsList>
              <TabsTrigger value="24h">24h</TabsTrigger>
              <TabsTrigger value="7d">7d</TabsTrigger>
              <TabsTrigger value="30d">30d</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <Button onClick={runTrainingBatch} variant="outline">
            <Zap className="w-4 h-4 mr-2" />
            Run Training
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className={stats.systemHealth > 0.8 ? "border-green-200 bg-green-50" : stats.systemHealth > 0.6 ? "border-yellow-200 bg-yellow-50" : "border-red-200 bg-red-50"}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats.systemHealth * 100).toFixed(1)}%</div>
            <Progress value={stats.systemHealth * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="w-4 h-4" />
              OCR Accuracy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats.ocrAccuracy * 100).toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground">
              {stats.totalEpisodes} episodes
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Design Success
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats.designSuccessRate * 100).toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground">
              Valid configurations
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Rule Coverage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeConstraints}</div>
            <div className="text-xs text-muted-foreground">
              Active constraints
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Performance Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.performanceTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats.performanceTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 1]} />
                  <Tooltip formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, '']} />
                  <Line type="monotone" dataKey="accuracy" stroke="#8884d8" name="OCR Accuracy" />
                  <Line type="monotone" dataKey="success" stroke="#82ca9d" name="Design Success" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No trend data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Recent Rewards
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentRewards.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.recentRewards.map((reward, i) => ({ episode: i + 1, reward }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="episode" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="reward" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No reward data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Training Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Training Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="text-sm font-medium">OCR Training</div>
              <div className="flex items-center gap-2">
                <Badge variant={stats.ocrAccuracy > 0.8 ? "default" : "secondary"}>
                  {stats.ocrAccuracy > 0.8 ? "Performing Well" : "Needs Improvement"}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                Pattern recognition and entity extraction
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Design Self-Play</div>
              <div className="flex items-center gap-2">
                <Badge variant={stats.designSuccessRate > 0.7 ? "default" : "secondary"}>
                  {stats.designSuccessRate > 0.7 ? "Optimizing Well" : "Learning"}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                Configuration optimization and validation
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Rule Synthesis</div>
              <div className="flex items-center gap-2">
                <Badge variant={stats.activeConstraints > 5 ? "default" : "secondary"}>
                  {stats.activeConstraints > 5 ? "Active" : "Building"}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                Automatic constraint generation
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}