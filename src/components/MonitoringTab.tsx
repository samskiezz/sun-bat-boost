
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { AlertTriangle, TrendingUp, TrendingDown, Activity, Eye, Bell, RefreshCw } from 'lucide-react';
import { toast } from "sonner";

interface DriftMonitor {
  id: string;
  monitor_name: string;
  model_name: string;
  monitor_type: 'data_drift' | 'concept_drift' | 'performance';
  thresholds: {
    warning: number;
    critical: number;
  };
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

interface DriftDetection {
  id: string;
  monitor_id: string;
  detection_timestamp: string;
  drift_score: number;
  drift_type: string;
  severity: 'green' | 'yellow' | 'red';
  details: any;
  remediated: boolean;
  created_at: string;
}

interface QualityMetric {
  timestamp: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  drift_score: number;
}

export function MonitoringTab() {
  const [monitors, setMonitors] = useState<DriftMonitor[]>([]);
  const [detections, setDetections] = useState<DriftDetection[]>([]);
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetric[]>([]);
  const [selectedMonitor, setSelectedMonitor] = useState<DriftMonitor | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [realTimeEnabled, setRealTimeEnabled] = useState(false);

  useEffect(() => {
    loadMonitors();
    loadDetections();
    generateQualityMetrics();
    
    if (realTimeEnabled) {
      const interval = setInterval(() => {
        loadDetections();
        generateQualityMetrics();
      }, 10000); // Update every 10 seconds
      return () => clearInterval(interval);
    }
  }, [realTimeEnabled]);

  const loadMonitors = async () => {
    const { data, error } = await supabase
      .from('drift_monitors')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error loading drift monitors:', error);
      toast.error('Failed to load drift monitors');
      return;
    }
    
    const mappedData: DriftMonitor[] = (data || []).map(item => ({
      id: item.id,
      monitor_name: item.monitor_name,
      model_name: item.model_name,
      monitor_type: item.monitor_type as 'data_drift' | 'concept_drift' | 'performance',
      thresholds: typeof item.thresholds === 'object' && item.thresholds && 'warning' in item.thresholds
        ? item.thresholds as { warning: number; critical: number; }
        : { warning: 0.3, critical: 0.5 },
      status: item.status as 'active' | 'inactive',
      created_at: item.created_at,
      updated_at: item.updated_at
    }));
    
    setMonitors(mappedData);
    if (mappedData.length > 0) {
      setSelectedMonitor(mappedData[0]);
    }
  };

  const loadDetections = async () => {
    const { data, error } = await supabase
      .from('drift_detections')
      .select('*')
      .order('detection_timestamp', { ascending: false })
      .limit(100);
    
    if (error) {
      console.error('Error loading drift detections:', error);
      toast.error('Failed to load drift detections');
      return;
    }
    
    const mappedData: DriftDetection[] = (data || []).map(item => ({
      id: item.id,
      monitor_id: item.monitor_id,
      detection_timestamp: item.detection_timestamp,
      drift_score: item.drift_score,
      drift_type: item.drift_type,
      severity: item.severity as 'green' | 'yellow' | 'red',
      details: item.details || {},
      remediated: item.remediated,
      created_at: item.created_at
    }));
    
    setDetections(mappedData);
  };

  const generateQualityMetrics = () => {
    // Generate synthetic quality metrics for demonstration
    const metrics = Array.from({ length: 24 }, (_, i) => ({
      timestamp: new Date(Date.now() - (23 - i) * 60 * 60 * 1000).toISOString(),
      accuracy: 0.85 + Math.random() * 0.1 + (Math.sin(i * 0.5) * 0.05),
      precision: 0.82 + Math.random() * 0.12 + (Math.cos(i * 0.3) * 0.04),
      recall: 0.79 + Math.random() * 0.15 + (Math.sin(i * 0.7) * 0.03),
      f1_score: 0.81 + Math.random() * 0.10 + (Math.cos(i * 0.4) * 0.04),
      drift_score: Math.max(0, Math.min(1, 0.1 + Math.random() * 0.3 + (Math.sin(i * 0.8) * 0.2)))
    }));
    
    setQualityMetrics(metrics);
  };

  const initializeDemoMonitors = async () => {
    const demoMonitors = [
      {
        monitor_name: 'OCR Model Data Drift',
        model_name: 'ocr_ensemble_v2',
        monitor_type: 'data_drift',
        thresholds: { warning: 0.3, critical: 0.5 },
        status: 'active'
      },
      {
        monitor_name: 'ROI Model Performance',
        model_name: 'roi_predictor_v3',
        monitor_type: 'performance',
        thresholds: { warning: 0.05, critical: 0.15 },
        status: 'active'
      },
      {
        monitor_name: 'Sizing Model Concept Drift',
        model_name: 'system_sizer_v1',
        monitor_type: 'concept_drift',
        thresholds: { warning: 0.2, critical: 0.4 },
        status: 'active'
      }
    ];

    // Clear existing monitors to avoid duplicates
    await supabase.from('drift_monitors').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    const { error } = await supabase
      .from('drift_monitors')
      .insert(demoMonitors);

    if (error) {
      console.error('Error initializing demo monitors:', error);
      toast.error('Failed to initialize demo monitors');
      return;
    }

    toast.success('Demo monitors initialized');
    loadMonitors();
  };

  const runDriftDetection = async () => {
    if (monitors.length === 0) {
      toast.error('No monitors found. Initialize demo monitors first.');
      return;
    }

    setIsMonitoring(true);

    // Simulate drift detection for each monitor
    const newDetections = [];
    
    for (const monitor of monitors) {
      const randomDrift = Math.random();
      let severity: 'green' | 'yellow' | 'red' = 'green';
      let driftScore = Math.random() * 0.2; // Low drift by default
      
      if (randomDrift < 0.2) { // 20% chance of drift
        if (randomDrift < 0.05) { // 5% chance of high drift
          severity = 'red';
          driftScore = 0.4 + Math.random() * 0.4;
        } else { // 15% chance of medium drift
          severity = 'yellow';
          driftScore = 0.2 + Math.random() * 0.2;
        }
      }

      let details: any = {};
      let driftType = monitor.monitor_type;

      if (monitor.monitor_type === 'data_drift') {
        details.affected_features = severity !== 'green' ? 
          ['image_quality', 'text_density'].slice(0, Math.floor(Math.random() * 2) + 1) : [];
      } else if (monitor.monitor_type === 'performance') {
        driftType = severity !== 'green' ? 'data_drift' : 'performance';
      } else {
        details.affected_features = severity !== 'green' ? 
          ['roof_area', 'usage_kwh', 'postcode'].slice(0, Math.floor(Math.random() * 3) + 1) : [];
      }

      if (severity !== 'green' || Math.random() < 0.3) { // Always log non-green, 30% chance for green
        newDetections.push({
          monitor_id: monitor.id,
          drift_score: driftScore,
          drift_type: driftType,
          severity,
          details,
          remediated: false
        });
      }
    }

    if (newDetections.length > 0) {
      const { error } = await supabase
        .from('drift_detections')
        .insert(newDetections);

      if (error) {
        console.error('Error saving drift detections:', error);
        toast.error('Failed to save drift detections');
      } else {
        const redAlerts = newDetections.filter(d => d.severity === 'red').length;
        const yellowAlerts = newDetections.filter(d => d.severity === 'yellow').length;
        
        if (redAlerts > 0) {
          toast.error(`${redAlerts} critical drift alerts detected!`);
        } else if (yellowAlerts > 0) {
          toast.warning(`${yellowAlerts} drift warnings detected`);
        } else {
          toast.success('Drift detection completed - all systems stable');
        }
        
        loadDetections();
      }
    } else {
      toast.success('Drift detection completed - all systems stable');
    }

    setIsMonitoring(false);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'green': return 'text-green-500';
      case 'yellow': return 'text-yellow-500';
      case 'red': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'green': return 'default';
      case 'yellow': return 'secondary';
      case 'red': return 'destructive';
      default: return 'outline';
    }
  };

  const recentAlerts = Array.isArray(detections) ? detections.filter(d => d.severity !== 'green').slice(0, 5) : [];
  const criticalAlerts = Array.isArray(detections) ? detections.filter(d => d.severity === 'red' && !d.remediated).length : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Drift & Quality Monitoring</h2>
          <p className="text-muted-foreground">
            Real-time model performance and data quality monitoring
          </p>
        </div>
        <div className="flex gap-2">
          {monitors.length === 0 && (
            <Button variant="outline" onClick={initializeDemoMonitors}>
              <Activity className="mr-2 h-4 w-4" />
              Initialize Monitors
            </Button>
          )}
          <Button 
            variant={realTimeEnabled ? "default" : "outline"}
            onClick={() => setRealTimeEnabled(!realTimeEnabled)}
          >
            <Eye className="mr-2 h-4 w-4" />
            Real-time {realTimeEnabled ? 'ON' : 'OFF'}
          </Button>
          <Button onClick={runDriftDetection} disabled={isMonitoring}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isMonitoring ? 'animate-spin' : ''}`} />
            {isMonitoring ? 'Detecting...' : 'Run Detection'}
          </Button>
        </div>
      </div>

      {/* Alert Summary */}
      {criticalAlerts > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <AlertDescription className="text-red-800">
            {criticalAlerts} critical drift alert{criticalAlerts > 1 ? 's' : ''} requiring immediate attention
          </AlertDescription>
        </Alert>
      )}

      {/* Monitor Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <div>
                <div className="text-2xl font-bold">{monitors.filter(m => m.status === 'active').length}</div>
                <div className="text-sm text-muted-foreground">Active Monitors</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <div className="text-2xl font-bold">{criticalAlerts}</div>
                <div className="text-sm text-muted-foreground">Critical Alerts</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <div>
                <div className="text-2xl font-bold">
                  {qualityMetrics.length > 0 ? (qualityMetrics[qualityMetrics.length - 1].accuracy * 100).toFixed(1) : 0}%
                </div>
                <div className="text-sm text-muted-foreground">Current Accuracy</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-yellow-500" />
              <div>
                <div className="text-2xl font-bold">{recentAlerts.length}</div>
                <div className="text-sm text-muted-foreground">Recent Alerts</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quality Metrics Charts */}
      <Card>
        <CardHeader>
          <CardTitle>Model Quality Metrics</CardTitle>
          <CardDescription>Real-time performance and drift monitoring</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="performance" className="w-full">
            <TabsList>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="drift">Drift Score</TabsTrigger>
              <TabsTrigger value="alerts">Recent Alerts</TabsTrigger>
            </TabsList>
            
            <TabsContent value="performance" className="mt-4">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={qualityMetrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                  />
                  <YAxis domain={[0, 1]} />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleString()}
                    formatter={(value: number) => [
                      `${(value * 100).toFixed(1)}%`,
                    ]}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="accuracy"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    name="Accuracy"
                  />
                  <Line
                    type="monotone"
                    dataKey="precision"
                    stroke="hsl(var(--secondary))"
                    strokeWidth={2}
                    name="Precision"
                  />
                  <Line
                    type="monotone"
                    dataKey="recall"
                    stroke="hsl(var(--accent))"
                    strokeWidth={2}
                    name="Recall"
                  />
                </LineChart>
              </ResponsiveContainer>
            </TabsContent>
            
            <TabsContent value="drift" className="mt-4">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={qualityMetrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                  />
                  <YAxis domain={[0, 1]} />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleString()}
                    formatter={(value: number) => [
                      `${(value * 100).toFixed(1)}%`,
                      'Drift Score'
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="drift_score"
                    stroke="hsl(var(--destructive))"
                    fill="hsl(var(--destructive))"
                    fillOpacity={0.3}
                    name="Drift Score"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </TabsContent>
            
            <TabsContent value="alerts" className="mt-4">
              <div className="space-y-3">
                {recentAlerts.length > 0 ? (
                  recentAlerts.map((alert) => {
                    const monitor = monitors.find(m => m.id === alert.monitor_id);
                    return (
                      <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className={`h-5 w-5 ${getSeverityColor(alert.severity)}`} />
                          <div>
                            <div className="font-medium">{monitor?.monitor_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {alert.drift_type} - Score: {(alert.drift_score * 100).toFixed(1)}%
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(alert.detection_timestamp).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {alert.details?.affected_features && alert.details.affected_features.length > 0 && (
                            <div className="text-xs text-muted-foreground">
                              Affected: {alert.details.affected_features.join(', ')}
                            </div>
                          )}
                          <Badge variant={getSeverityBadge(alert.severity)}>
                            {alert.severity.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No recent alerts - all models performing within thresholds
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Monitor Configuration */}
      {monitors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Monitor Configuration</CardTitle>
            <CardDescription>Active drift and quality monitors</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {monitors.map((monitor) => {
                const recentDetection = Array.isArray(detections) ? detections
                  .filter(d => d.monitor_id === monitor.id)
                  .sort((a, b) => new Date(b.detection_timestamp).getTime() - new Date(a.detection_timestamp).getTime())[0] : null;
                
                return (
                  <div
                    key={monitor.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedMonitor?.id === monitor.id ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedMonitor(monitor)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline">{monitor.monitor_type}</Badge>
                      <Badge variant={monitor.status === 'active' ? 'default' : 'secondary'}>
                        {monitor.status}
                      </Badge>
                    </div>
                    <div className="text-sm font-medium mb-1">{monitor.monitor_name}</div>
                    <div className="text-xs text-muted-foreground mb-2">{monitor.model_name}</div>
                    
                    {recentDetection && (
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">
                          Last check: {new Date(recentDetection.detection_timestamp).toLocaleDateString()}
                        </div>
                        <Badge variant={getSeverityBadge(recentDetection.severity)}>
                          {(recentDetection.drift_score * 100).toFixed(0)}%
                        </Badge>
                      </div>
                    )}

                    <div className="mt-2">
                      <div className="text-xs text-muted-foreground mb-1">Thresholds</div>
                      <div className="flex gap-2 text-xs">
                        <span>Warning: {(monitor.thresholds.warning * 100).toFixed(0)}%</span>
                        <span>Critical: {(monitor.thresholds.critical * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
