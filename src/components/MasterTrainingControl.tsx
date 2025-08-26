import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  Clock,
  Brain,
  FileText,
  Smartphone,
  Target,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface OrchestratorSession {
  id: string;
  status: string;
  current_phase: string;
  total_phases: number;
  completed_phases: number;
  config: any;
  error?: string;
  started_at: string;
  completed_at?: string;
}

interface OrchestratorPhase {
  phase_name: string;
  phase_status: string;
  progress_percent: number;
  details: any;
  error?: string;
  started_at?: string;
  completed_at?: string;
}

const PHASE_ICONS = {
  pdf_processing: FileText,
  multitask_training: Brain,
  npu_build: Smartphone,
  legacy_training: Target,
  completion: Sparkles
};

const PHASE_LABELS = {
  pdf_processing: 'PDF Processing',
  multitask_training: 'AI Multi-Task Training',
  npu_build: 'NPU Model Build',
  legacy_training: 'Legacy System Training',
  completion: 'System Finalization'
};

export default function MasterTrainingControl() {
  const [session, setSession] = useState<OrchestratorSession | null>(null);
  const [phases, setPhases] = useState<OrchestratorPhase[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadStatus();
    
    // Load from localStorage if available
    const savedSession = localStorage.getItem('masterTrainingSession');
    if (savedSession) {
      try {
        const parsedSession = JSON.parse(savedSession);
        setSession(parsedSession);
      } catch (e) {
        console.error('Failed to parse saved session:', e);
      }
    }
    
    // Refresh every 5 seconds when training is active
    const interval = setInterval(() => {
      if (session?.status === 'running') {
        loadStatus();
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [session?.status]);

  const loadStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('training-orchestrator', {
        body: { action: 'get_status' }
      });

      if (error) {
        console.error('Failed to load orchestrator status:', error);
        return;
      }

      if (data?.success) {
        setSession(data.session);
        setPhases(data.phases || []);
        
        // Save to localStorage
        if (data.session) {
          localStorage.setItem('masterTrainingSession', JSON.stringify(data.session));
        }
      }
    } catch (error) {
      console.error('Status loading error:', error);
    }
  };

  const startMasterTraining = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      const config = {
        episodes: 10000, // Reasonable default
        batchSize: 500,
        skipPDFProcessing: false,
        skipMultitaskTraining: false,
        skipLegacyTraining: false
      };

      const { data, error } = await supabase.functions.invoke('training-orchestrator', {
        body: { 
          action: 'start_master_training',
          config
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "🚀 Master Training Started",
          description: "Full AI training pipeline initiated. This will run automatically in the background.",
        });
        
        // Immediately refresh status
        setTimeout(loadStatus, 2000);
      } else {
        throw new Error(data?.error || 'Failed to start master training');
      }
    } catch (error) {
      console.error('Master training error:', error);
      toast({
        title: "❌ Training Failed to Start",
        description: error.message || 'Unknown error occurred',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const pauseTraining = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('training-orchestrator', {
        body: { action: 'pause' }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "⏸️ Training Paused",
          description: "Master training has been paused. You can resume it later.",
        });
        loadStatus();
      }
    } catch (error) {
      console.error('Pause error:', error);
      toast({
        title: "❌ Failed to Pause",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resumeTraining = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('training-orchestrator', {
        body: { action: 'resume' }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "▶️ Training Resumed",
          description: "Master training has been resumed and will continue in the background.",
        });
        loadStatus();
      }
    } catch (error) {
      console.error('Resume error:', error);
      toast({
        title: "❌ Failed to Resume",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getOverallProgress = () => {
    if (!session || !phases.length) return 0;
    
    const totalProgress = phases.reduce((sum, phase) => sum + (phase.progress_percent || 0), 0);
    return Math.round(totalProgress / phases.length);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-500';
      case 'running': return 'bg-blue-500';
      case 'failed': return 'bg-red-500';
      case 'paused': return 'bg-yellow-500';
      default: return 'bg-slate-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle2;
      case 'running': return Play;
      case 'failed': return AlertTriangle;
      case 'paused': return Pause;
      default: return Clock;
    }
  };

  return (
    <div className="space-y-6">
      {/* Master Control Card */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl">
            <div className="p-2 rounded-full bg-primary/10">
              <Brain className="w-6 h-6 text-primary" />
            </div>
            One-Click AI Training Master Control
            {session?.status && (
              <Badge variant={session.status === 'completed' ? 'default' : 'secondary'}>
                {session.status}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Control Buttons */}
          <div className="flex items-center gap-4">
            {!session || session.status === 'completed' || session.status === 'failed' ? (
              <Button
                onClick={startMasterTraining}
                disabled={isLoading}
                size="lg"
                className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
              >
                <Play className="w-5 h-5" />
                {isLoading ? 'Starting...' : 'Start Master Training'}
              </Button>
            ) : (
              <div className="flex gap-2">
                {session.status === 'running' && (
                  <Button onClick={pauseTraining} variant="outline" size="lg">
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                  </Button>
                )}
                {session.status === 'paused' && (
                  <Button onClick={resumeTraining} size="lg">
                    <Play className="w-4 h-4 mr-2" />
                    Resume
                  </Button>
                )}
              </div>
            )}
            
            <Button onClick={loadStatus} variant="ghost" size="lg">
              <RotateCcw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Overall Progress */}
          {session && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm text-muted-foreground">
                  {session.completed_phases}/{session.total_phases} phases completed
                </span>
              </div>
              <Progress 
                value={getOverallProgress()} 
                className="h-2"
              />
              <div className="text-xs text-muted-foreground">
                Current Phase: {PHASE_LABELS[session.current_phase as keyof typeof PHASE_LABELS] || session.current_phase}
              </div>
            </div>
          )}

          {/* Session Info */}
          {session && (
            <div className="text-sm text-muted-foreground">
              Session ID: {session.id.slice(0, 8)}... | 
              Started: {new Date(session.started_at).toLocaleDateString()} {new Date(session.started_at).toLocaleTimeString()}
              {session.completed_at && (
                <> | Completed: {new Date(session.completed_at).toLocaleDateString()} {new Date(session.completed_at).toLocaleTimeString()}</>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Training Phases */}
      {phases.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Training Pipeline Phases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {phases.map((phase, index) => {
                const PhaseIcon = PHASE_ICONS[phase.phase_name as keyof typeof PHASE_ICONS] || Clock;
                const StatusIcon = getStatusIcon(phase.phase_status);
                
                return (
                  <div key={phase.phase_name} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="p-2 rounded-full bg-muted">
                        <PhaseIcon className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {PHASE_LABELS[phase.phase_name as keyof typeof PHASE_LABELS] || phase.phase_name}
                          </span>
                          <div className="flex items-center gap-1">
                            <StatusIcon className="w-4 h-4" />
                            <Badge variant="outline" className={getStatusColor(phase.phase_status)}>
                              {phase.phase_status}
                            </Badge>
                          </div>
                        </div>
                        {phase.phase_status === 'running' && (
                          <Progress 
                            value={phase.progress_percent} 
                            className="h-1 mt-2"
                          />
                        )}
                        {phase.error && (
                          <div className="text-xs text-destructive mt-1">
                            Error: {phase.error}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      {phase.phase_status === 'running' && `${Math.round(phase.progress_percent)}%`}
                      {phase.completed_at && (
                        <div>
                          ✓ {new Date(phase.completed_at).toLocaleTimeString()}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Text */}
      <Alert>
        <Brain className="h-4 w-4" />
        <AlertDescription>
          <strong>Fully Automated Training:</strong> This system will automatically process PDFs, 
          train multi-task AI models, build NPU-optimized versions, run legacy training episodes, 
          and finalize the system. No manual intervention required - everything runs in the background!
        </AlertDescription>
      </Alert>
    </div>
  );
}