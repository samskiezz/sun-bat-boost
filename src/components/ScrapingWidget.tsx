import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { adaptStatus, ProgressRow, Cat } from '@/lib/progress-adapter';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Database, Play, RotateCcw, CheckCircle } from 'lucide-react';

type Status = { job?: { id: string; status: string }, progress: ProgressRow[] };

const pretty: Record<Cat,string> = {
  PANEL: 'Panels',
  BATTERY_MODULE: 'Batteries',
  INVERTER: 'Inverters',
};

const getStatusColor = (state: string) => {
  switch (state) {
    case 'completed': return 'bg-green-500';
    case 'processing': return 'bg-blue-500 animate-pulse';
    case 'failed': return 'bg-red-500';
    default: return 'bg-gray-400';
  }
};

const getStatusBadge = (state: string) => {
  switch (state) {
    case 'completed': return 'bg-green-100 text-green-800 border-green-200';
    case 'processing': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'failed': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export default function ScrapingWidget() {
  const [jobId, setJobId] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<Status | null>(null);
  const [busy, setBusy] = React.useState(false);
  const { toast } = useToast();
  const running = status?.job?.status === 'running';

  console.log('🏗️ ScrapingWidget mounted/re-rendered. Status:', status);

  React.useEffect(() => {
    console.log('📂 Loading saved job ID from localStorage...');
    const saved = localStorage.getItem('scrape_job_id');
    if (saved) {
      console.log('📂 Found saved job ID:', saved);
      setJobId(saved);
    } else {
      console.log('📂 No saved job ID found');
    }
  }, []);

  React.useEffect(() => {
    let stop = false;
    let timer: any;

    async function tickOnce() {
      try {
        await supabase.functions.invoke('cec-comprehensive-scraper', {
          body: { action: 'tick' }
        });
      } catch (e) {
        console.error('tick error', e);
      }
    }
    
    async function poll() {
      if (stop) return;
      try {
        const { data, error } = await supabase.functions.invoke('cec-comprehensive-scraper', {
          body: { action: 'status' }
        });
        
        if (error) throw error;
        
        const adapted = adaptStatus(data);
        setStatus(adapted);
        
        if (adapted.job?.status === 'running') {
          await tickOnce();
          timer = setTimeout(() => poll(), 2000);
        }
      } catch (e) {
        console.error('status error', e);
        timer = setTimeout(() => poll(), 4000);
      }
    }

    if (jobId) poll();
    return () => { stop = true; clearTimeout(timer); };
  }, [jobId]);

  async function start() {
    console.log('🚀🚀🚀 SCRAPING WIDGET START BUTTON CLICKED! 🚀🚀🚀');
    setBusy(true);
    try {
      console.log('🔍 Checking if job is already running...');
      // Check if job is already running
      const { data: statusData, error: statusError } = await supabase.functions.invoke('cec-comprehensive-scraper', {
        body: { action: 'status' }
      });
      
      if (statusError) throw statusError;
      console.log('📊 Status data received:', statusData);
      
      if (statusData?.job?.status === 'running') {
        console.log('⚠️ Job already running, using existing job');
        setJobId(statusData.job.id);
        localStorage.setItem('scrape_job_id', statusData.job.id);
        
        // Set the status immediately so UI updates
        console.log('🔄 Calling adaptStatus with data:', statusData);
        const adapted = adaptStatus(statusData);
        console.log('✅ Adapted status result:', adapted);
        setStatus(adapted);
        
        toast({
          title: "Job Already Running",
          description: "Resuming existing scraping job.",
        });
        return;
      }
      
      console.log('🆕 Starting new job...');
      // Start new job
      const { data: startData, error: startError } = await supabase.functions.invoke('cec-comprehensive-scraper', {
        body: { action: 'start' }
      });
      
      if (startError) throw startError;
      console.log('📈 Start data received:', startData);
      
      const newJobId = startData?.job_id || startData?.id;
      if (!newJobId) {
        throw new Error('No job_id returned from scraper');
      }
      
      localStorage.setItem('scrape_job_id', newJobId);
      setJobId(newJobId);
      
      // If we got progress data back, set it immediately
      if (startData.progress) {
        console.log('🔄 Calling adaptStatus with start data:', startData);
        const adapted = adaptStatus(startData);
        console.log('✅ Adapted start status result:', adapted);
        setStatus(adapted);
      }
      
      toast({
        title: "Scraping Started",
        description: "Data collection job initiated successfully.",
      });
      
    } catch (e) {
      console.error('❌ Start function error:', e);
      toast({
        title: "Start Failed", 
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    if (!confirm('⚠️ This will cancel all jobs and clear data. Continue?')) return;
    
    setBusy(true);
    try {
      const { error } = await supabase.functions.invoke('cec-comprehensive-scraper', {
        body: { action: 'reset' }
      });
      
      if (error) throw error;
      
      localStorage.removeItem('scrape_job_id');
      setJobId(null);
      setStatus(null);
      
      toast({
        title: "Reset Complete",
        description: "All jobs reset and data cleared.",
      });
    } catch (e) {
      toast({
        title: "Reset Failed",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  const rows: ProgressRow[] = status?.progress ?? [];
  const order: Cat[] = ['PANEL','BATTERY_MODULE','INVERTER'];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Database className="w-5 h-5" />
          Data Collection
          {status?.job && (
            <div className={`w-2 h-2 rounded-full ${getStatusColor(status.job.status)}`} />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            onClick={start}
            disabled={busy || running}
            size="sm"
            className="flex-1"
          >
            <Play className="w-3 h-3 mr-1" />
            {running ? 'Running...' : busy ? 'Starting...' : 'Start'}
          </Button>
          <Button
            onClick={reset}
            disabled={busy || running}
            variant="outline"
            size="sm"
          >
            <RotateCcw className="w-3 h-3" />
          </Button>
        </div>

        {status?.job && (
          <div className="text-xs text-muted-foreground">
            Job: {status.job.id.slice(0, 8)}... • {status.job.status}
          </div>
        )}

        <div className="space-y-3">
          {order.map(cat => {
            const r = rows.find(x => x.category === cat);
            const state = r?.state ?? 'pending';
            const progress = r?.target ? Math.round((r.specs_done / r.target) * 100) : 0;

            return (
              <div key={cat} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{pretty[cat]}</span>
                  <Badge variant="outline" className={getStatusBadge(state)}>
                    {state}
                  </Badge>
                </div>
                <Progress value={progress} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{r?.specs_done ?? 0} / {r?.target ?? 0}</span>
                  <span>{progress}%</span>
                </div>
              </div>
            );
          })}
        </div>

        {!status && (
          <div className="text-sm text-muted-foreground text-center py-2">
            Click Start to begin data collection
          </div>
        )}
      </CardContent>
    </Card>
  );
}