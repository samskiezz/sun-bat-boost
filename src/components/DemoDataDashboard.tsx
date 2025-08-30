import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  TrendingUp, 
  Database, 
  Cpu, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  BarChart3,
  Zap
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { deterministicRandom, createSeededRandom } from '@/utils/deterministicRandom';

interface DemoDataDashboardProps {
  type: 'monitoring' | 'health' | 'training';
  title: string;
  subtitle?: string;
}

export const DemoDataDashboard: React.FC<DemoDataDashboardProps> = ({
  type,
  title,
  subtitle
}) => {
  const [refreshing, setRefreshing] = useState(false);
  const [dataTimestamp] = useState(new Date().toISOString());

  // Generate deterministic demo data based on dashboard type
  const demoData = useMemo(() => {
    const seed = `${type}-${dataTimestamp}`;
    const rng = createSeededRandom(seed);
    
    const generateTimeSeriesData = (points: number, baseValue: number, variance: number) => {
      return Array.from({ length: points }, (_, i) => ({
        time: new Date(Date.now() - (points - i) * 3600000).toLocaleTimeString(),
        value: baseValue + (rng.next() - 0.5) * variance,
        timestamp: Date.now() - (points - i) * 3600000
      }));
    };

    switch (type) {
      case 'monitoring':
        return {
          metrics: [
            { name: 'System Uptime', value: 99.8, unit: '%', status: 'good', trend: 0.2 },
            { name: 'Response Time', value: 145, unit: 'ms', status: 'warning', trend: -5.2 },
            { name: 'Error Rate', value: 0.12, unit: '%', status: 'good', trend: -0.05 },
            { name: 'Throughput', value: 1247, unit: 'req/min', status: 'good', trend: 12.5 }
          ],
          timeSeries: generateTimeSeriesData(24, 1200, 200),
          alerts: [
            { level: 'warning', message: 'High memory usage detected on ML service', time: '2 hours ago' },
            { level: 'info', message: 'Scheduled maintenance completed successfully', time: '6 hours ago' }
          ]
        };
        
      case 'health':
        return {
          metrics: [
            { name: 'Model Accuracy', value: 94.3, unit: '%', status: 'good', trend: 1.2 },
            { name: 'Data Quality', value: 97.8, unit: '%', status: 'good', trend: 0.5 },
            { name: 'Prediction Latency', value: 89, unit: 'ms', status: 'good', trend: -12.1 },
            { name: 'Cache Hit Rate', value: 87.2, unit: '%', status: 'warning', trend: -2.3 }
          ],
          timeSeries: generateTimeSeriesData(24, 94, 3),
          systemStatus: [
            { component: 'ML Pipeline', status: 'healthy', lastCheck: '30s ago' },
            { component: 'Database', status: 'healthy', lastCheck: '1m ago' },
            { component: 'API Gateway', status: 'degraded', lastCheck: '45s ago' },
            { component: 'Cache Layer', status: 'healthy', lastCheck: '15s ago' }
          ]
        };
        
      case 'training':
        return {
          metrics: [
            { name: 'Training Progress', value: 87.4, unit: '%', status: 'good', trend: 2.1 },
            { name: 'Model Loss', value: 0.034, unit: '', status: 'good', trend: -15.2 },
            { name: 'Validation Accuracy', value: 93.7, unit: '%', status: 'good', trend: 0.8 },
            { name: 'Learning Rate', value: 0.001, unit: '', status: 'good', trend: 0 }
          ],
          timeSeries: generateTimeSeriesData(50, 0.1, 0.05).map((point, i) => ({
            ...point,
            value: Math.max(0.001, point.value - (i * 0.001)), // Decreasing loss
            epoch: i + 1
          })),
          trainingRuns: [
            { id: 'run_001', status: 'completed', accuracy: 94.2, duration: '45m', model: 'solar_roi_v2.1' },
            { id: 'run_002', status: 'running', accuracy: 93.7, duration: '12m', model: 'solar_roi_v2.2' },
            { id: 'run_003', status: 'queued', accuracy: null, duration: null, model: 'solar_roi_v2.3' }
          ]
        };
        
      default:
        return { metrics: [], timeSeries: [], alerts: [] };
    }
  }, [type, dataTimestamp]);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': case 'healthy': case 'completed': return 'text-green-400';
      case 'warning': case 'degraded': case 'running': return 'text-yellow-400';
      case 'error': case 'failed': case 'queued': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good': case 'healthy': case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'warning': case 'degraded': case 'running': return <AlertTriangle className="h-4 w-4" />;
      case 'error': case 'failed': return <AlertTriangle className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          {subtitle && (
            <p className="text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        
        <Button 
          onClick={handleRefresh}
          variant="outline"
          disabled={refreshing}
          className="border-white/20 hover:bg-white/10"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {demoData.metrics.map((metric, index) => (
          <Card key={index} className="border-white/20 bg-white/5">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{metric.name}</p>
                  <p className="text-2xl font-bold">
                    {metric.value}{metric.unit}
                  </p>
                  {metric.trend !== 0 && (
                    <div className={`flex items-center text-xs mt-1 ${
                      metric.trend > 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {Math.abs(metric.trend)}%
                    </div>
                  )}
                </div>
                <div className={getStatusColor(metric.status)}>
                  {getStatusIcon(metric.status)}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Charts and Data */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-white/10 border border-white/20">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="charts">Performance</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <Card className="border-white/20 bg-white/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                System Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={demoData.timeSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="time" stroke="rgba(255,255,255,0.5)" />
                  <YAxis stroke="rgba(255,255,255,0.5)" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(0,0,0,0.8)', 
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '8px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="hsl(var(--primary))" 
                    fill="hsl(var(--primary))" 
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="charts" className="space-y-4">
          <Card className="border-white/20 bg-white/5">
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
            </CardHeader>  
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={demoData.timeSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey={type === 'training' ? 'epoch' : 'time'} stroke="rgba(255,255,255,0.5)" />
                  <YAxis stroke="rgba(255,255,255,0.5)" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(0,0,0,0.8)', 
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="details" className="space-y-4">
          {type === 'monitoring' && demoData.alerts && (
            <Card className="border-white/20 bg-white/5">
              <CardHeader>
                <CardTitle>Recent Alerts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {demoData.alerts.map((alert: any, index: number) => (
                  <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                    <div className={getStatusColor(alert.level)}>
                      {getStatusIcon(alert.level)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">{alert.message}</p>
                      <p className="text-xs text-muted-foreground">{alert.time}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          
          {type === 'health' && demoData.systemStatus && (
            <Card className="border-white/20 bg-white/5">
              <CardHeader>
                <CardTitle>Component Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {demoData.systemStatus.map((component: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                    <div className="flex items-center gap-3">
                      <div className={getStatusColor(component.status)}>
                        {getStatusIcon(component.status)}
                      </div>
                      <span>{component.component}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {component.lastCheck}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          
          {type === 'training' && demoData.trainingRuns && (
            <Card className="border-white/20 bg-white/5">
              <CardHeader>
                <CardTitle>Training Runs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {demoData.trainingRuns.map((run: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                    <div className="flex items-center gap-3">
                      <div className={getStatusColor(run.status)}>
                        {getStatusIcon(run.status)}
                      </div>
                      <div>
                        <p className="font-medium">{run.model}</p>
                        <p className="text-xs text-muted-foreground">{run.id}</p>
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      {run.accuracy && <div>Accuracy: {run.accuracy}%</div>}
                      {run.duration && <div className="text-muted-foreground">{run.duration}</div>}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};