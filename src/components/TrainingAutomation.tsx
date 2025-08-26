import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Clock, 
  Play, 
  Pause, 
  Settings, 
  Calendar,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Bot,
  Timer,
  TrendingUp
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AutomationConfig {
  enabled: boolean;
  scheduleType: 'daily' | 'weekly' | 'data_driven' | 'performance_driven';
  scheduleTime: string;
  weekday: string;
  triggerConditions: {
    dataFreshness: boolean;
    performanceThreshold: boolean;
    minimumInterval: number; // hours
  };
  autoRetry: boolean;
  maxRetries: number;
}

interface AutomationStatus {
  isRunning: boolean;
  nextScheduledRun?: string;
  lastRun?: string;
  lastRunStatus: 'success' | 'failed' | 'pending';
  runsToday: number;
  totalRuns: number;
}

export default function TrainingAutomation() {
  const [config, setConfig] = useState<AutomationConfig>({
    enabled: false,
    scheduleType: 'daily',
    scheduleTime: '02:00',
    weekday: 'sunday',
    triggerConditions: {
      dataFreshness: true,
      performanceThreshold: false,
      minimumInterval: 24
    },
    autoRetry: true,
    maxRetries: 3
  });
  
  const [status, setStatus] = useState<AutomationStatus>({
    isRunning: false,
    lastRunStatus: 'pending',
    runsToday: 0,
    totalRuns: 0
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadAutomationConfig();
    loadAutomationStatus();
    
    // Check automation triggers every 30 minutes
    const interval = setInterval(() => {
      if (config.enabled) {
        checkAutomationTriggers();
      }
    }, 30 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [config.enabled]);

  const loadAutomationConfig = () => {
    const savedConfig = localStorage.getItem('trainingAutomationConfig');
    if (savedConfig) {
      try {
        setConfig(JSON.parse(savedConfig));
      } catch (e) {
        console.error('Failed to load automation config:', e);
      }
    }
  };

  const saveAutomationConfig = (newConfig: AutomationConfig) => {
    setConfig(newConfig);
    localStorage.setItem('trainingAutomationConfig', JSON.stringify(newConfig));
    
    toast({
      title: "🤖 Automation Updated",
      description: "Training automation configuration has been saved.",
    });
  };

  const loadAutomationStatus = () => {
    const savedStatus = localStorage.getItem('trainingAutomationStatus');
    if (savedStatus) {
      try {
        setStatus(JSON.parse(savedStatus));
      } catch (e) {
        console.error('Failed to load automation status:', e);
      }
    }
    
    // Calculate next scheduled run
    if (config.enabled && config.scheduleType !== 'data_driven') {
      const nextRun = calculateNextScheduledRun();
      setStatus(prev => ({ ...prev, nextScheduledRun: nextRun }));
    }
  };

  const calculateNextScheduledRun = (): string => {
    const now = new Date();
    const nextRun = new Date();
    
    if (config.scheduleType === 'daily') {
      const [hours, minutes] = config.scheduleTime.split(':').map(Number);
      nextRun.setHours(hours, minutes, 0, 0);
      
      // If time has passed today, schedule for tomorrow
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
    } else if (config.scheduleType === 'weekly') {
      const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const targetDay = weekdays.indexOf(config.weekday);
      const currentDay = now.getDay();
      
      let daysToAdd = targetDay - currentDay;
      if (daysToAdd <= 0) {
        daysToAdd += 7; // Next week
      }
      
      const [hours, minutes] = config.scheduleTime.split(':').map(Number);
      nextRun.setDate(now.getDate() + daysToAdd);
      nextRun.setHours(hours, minutes, 0, 0);
    }
    
    return nextRun.toISOString();
  };

  const checkAutomationTriggers = async () => {
    try {
      let shouldTrigger = false;
      const triggers: string[] = [];
      
      // Check if enough time has passed since last run
      if (status.lastRun) {
        const lastRun = new Date(status.lastRun);
        const hoursSinceLastRun = (Date.now() - lastRun.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceLastRun < config.triggerConditions.minimumInterval) {
          return; // Too soon since last run
        }
      }
      
      // Check scheduled time trigger
      if (config.scheduleType === 'daily' || config.scheduleType === 'weekly') {
        const now = new Date();
        const nextScheduled = new Date(status.nextScheduledRun || '');
        
        if (now >= nextScheduled) {
          shouldTrigger = true;
          triggers.push('scheduled_time');
        }
      }
      
      // Check data freshness trigger
      if (config.triggerConditions.dataFreshness && config.scheduleType === 'data_driven') {
        const { data: freshness } = await supabase.functions.invoke('cec-comprehensive-scraper', {
          body: { action: 'check_data_freshness' }
        });
        
        if (freshness?.needsUpdate) {
          shouldTrigger = true;
          triggers.push('data_updated');
        }
      }
      
      // Check performance threshold trigger
      if (config.triggerConditions.performanceThreshold && config.scheduleType === 'performance_driven') {
        // Check if system performance has degraded
        const { data: metrics } = await supabase.from('training_metrics')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);
          
        if (metrics && metrics.length > 0) {
          const avgAccuracy = metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;
          if (avgAccuracy < 0.85) { // Below 85% accuracy threshold
            shouldTrigger = true;
            triggers.push('performance_degraded');
          }
        }
      }
      
      if (shouldTrigger) {
        await triggerAutomatedTraining(triggers);
      }
      
    } catch (error) {
      console.error('Automation trigger check failed:', error);
    }
  };

  const triggerAutomatedTraining = async (triggers: string[]) => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.functions.invoke('training-orchestrator', {
        body: { 
          action: 'start_master_training',
          config: {
            episodes: 10000,
            batchSize: 500,
            skipPDFProcessing: false,
            skipMultitaskTraining: false,
            skipLegacyTraining: false,
            automated: true,
            triggers
          }
        }
      });

      if (error) throw error;

      if (data?.success) {
        const newStatus = {
          ...status,
          isRunning: true,
          lastRun: new Date().toISOString(),
          lastRunStatus: 'pending' as const,
          runsToday: status.runsToday + 1,
          totalRuns: status.totalRuns + 1
        };
        
        setStatus(newStatus);
        localStorage.setItem('trainingAutomationStatus', JSON.stringify(newStatus));
        
        toast({
          title: "🤖 Automated Training Started",
          description: `Training triggered by: ${triggers.join(', ')}`,
        });
      }
    } catch (error) {
      console.error('Automated training failed:', error);
      
      if (config.autoRetry && status.totalRuns < config.maxRetries) {
        setTimeout(() => triggerAutomatedTraining(triggers), 30 * 60 * 1000); // Retry in 30 minutes
      }
      
      toast({
        title: "❌ Automated Training Failed",
        description: "Training will be retried automatically in 30 minutes.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAutomation = (enabled: boolean) => {
    const newConfig = { ...config, enabled };
    saveAutomationConfig(newConfig);
    
    toast({
      title: enabled ? "🟢 Automation Enabled" : "🔴 Automation Disabled",
      description: enabled 
        ? "Training will now run automatically based on your schedule."
        : "Automatic training has been disabled.",
    });
  };

  const runTrainingNow = async () => {
    await triggerAutomatedTraining(['manual_trigger']);
  };

  return (
    <div className="space-y-6">
      {/* Main Automation Control */}
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl">
            <div className="p-2 rounded-full bg-blue-100">
              <Bot className="w-6 h-6 text-blue-600" />
            </div>
            Training Automation System
            <Badge variant={config.enabled ? 'default' : 'secondary'}>
              {config.enabled ? 'Active' : 'Inactive'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Master Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="font-medium">Enable Automated Training</h3>
              <p className="text-sm text-muted-foreground">
                Automatically trigger training based on schedule and conditions
              </p>
            </div>
            <Switch 
              checked={config.enabled}
              onCheckedChange={toggleAutomation}
            />
          </div>

          {/* Status Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">{status.totalRuns}</div>
              <div className="text-sm text-muted-foreground">Total Runs</div>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{status.runsToday}</div>
              <div className="text-sm text-muted-foreground">Today</div>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <div className="flex items-center justify-center gap-1 mb-1">
                {status.lastRunStatus === 'success' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                {status.lastRunStatus === 'failed' && <AlertTriangle className="w-4 h-4 text-red-500" />}
                {status.lastRunStatus === 'pending' && <Clock className="w-4 h-4 text-yellow-500" />}
              </div>
              <div className="text-sm text-muted-foreground">Last Run</div>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <Button 
                onClick={runTrainingNow}
                disabled={isLoading || status.isRunning}
                size="sm"
                variant="outline"
              >
                <Play className="w-3 h-3 mr-1" />
                Run Now
              </Button>
            </div>
          </div>

          {/* Next Scheduled Run */}
          {config.enabled && status.nextScheduledRun && (
            <Alert>
              <Timer className="h-4 w-4" />
              <AlertDescription>
                <strong>Next Scheduled Run:</strong> {new Date(status.nextScheduledRun).toLocaleString()}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Automation Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Schedule Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Schedule Type</label>
            <Select
              value={config.scheduleType}
              onValueChange={(value: any) => saveAutomationConfig({ ...config, scheduleType: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Daily at specific time
                  </div>
                </SelectItem>
                <SelectItem value="weekly">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Weekly on specific day
                  </div>
                </SelectItem>
                <SelectItem value="data_driven">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    When new data is available
                  </div>
                </SelectItem>
                <SelectItem value="performance_driven">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    When performance degrades
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Time Configuration */}
          {(config.scheduleType === 'daily' || config.scheduleType === 'weekly') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Time</label>
                <input
                  type="time"
                  value={config.scheduleTime}
                  onChange={(e) => saveAutomationConfig({ ...config, scheduleTime: e.target.value })}
                  className="w-full p-2 border rounded-md"
                />
              </div>
              
              {config.scheduleType === 'weekly' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Day of Week</label>
                  <Select
                    value={config.weekday}
                    onValueChange={(value) => saveAutomationConfig({ ...config, weekday: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map(day => (
                        <SelectItem key={day} value={day}>
                          {day.charAt(0).toUpperCase() + day.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Advanced Options */}
          <div className="space-y-3 pt-4 border-t">
            <h4 className="font-medium text-sm">Advanced Options</h4>
            
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Auto-retry on failure</div>
                <div className="text-xs text-muted-foreground">Automatically retry failed training runs</div>
              </div>
              <Switch 
                checked={config.autoRetry}
                onCheckedChange={(autoRetry) => saveAutomationConfig({ ...config, autoRetry })}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Minimum interval between runs (hours)</label>
              <input
                type="number"
                min="1"
                max="168"
                value={config.triggerConditions.minimumInterval}
                onChange={(e) => saveAutomationConfig({ 
                  ...config, 
                  triggerConditions: { 
                    ...config.triggerConditions, 
                    minimumInterval: parseInt(e.target.value) || 24 
                  }
                })}
                className="w-full p-2 border rounded-md"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Help */}
      <Alert>
        <Bot className="h-4 w-4" />
        <AlertDescription>
          <strong>Smart Automation:</strong> The system monitors data freshness, performance metrics, 
          and schedules to automatically trigger training when needed. This ensures your AI models 
          stay up-to-date and perform optimally without manual intervention.
        </AlertDescription>
      </Alert>
    </div>
  );
}