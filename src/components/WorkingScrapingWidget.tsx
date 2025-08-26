import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Database, Play, RotateCcw, StopCircle, Pause } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface JobData {
  id: string;
  status: string;
}

interface CategoryProgress {
  category: string;
  current: number;
  target: number;
  percentage: number;
}

export default function WorkingScrapingWidget() {
  const [job, setJob] = useState<JobData | null>(null);
  const [progress, setProgress] = useState<CategoryProgress[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Load data immediately when component mounts
  useEffect(() => {
    console.log('🔄 WorkingScrapingWidget mounted - loading data...');
    loadCurrentStatus();
    
    // Poll for updates every 3 seconds
    const interval = setInterval(loadCurrentStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  async function loadCurrentStatus() {
    try {
      // Get job status
      const { data: statusData, error: statusError } = await supabase.functions.invoke('cec-comprehensive-scraper', {
        body: { action: 'status' }
      });

      if (statusError) {
        console.error('Status error:', statusError);
        return;
      }

      console.log('📊 Raw status data:', statusData);

      // Set job info if we have it
      if (statusData?.job) {
        setJob({
          id: statusData.job.id,
          status: statusData.job.status
        });
        
        // Save job ID to localStorage
        localStorage.setItem('scrape_job_id', statusData.job.id);
      }

      // Calculate real progress using productCounts
      const productCounts = statusData?.productCounts || [];
      const newProgress: CategoryProgress[] = [];

      // Panel progress
      const panelData = productCounts.find((p: any) => p.category === 'PANEL');
      if (panelData) {
        newProgress.push({
          category: 'Panels',
          current: Math.min(panelData.total_count || 0, 1348),
          target: 1348,
          percentage: Math.min(100, Math.round(((panelData.total_count || 0) / 1348) * 100))
        });
      } else {
        newProgress.push({
          category: 'Panels',
          current: 0,
          target: 1348,
          percentage: 0
        });
      }

      // Battery progress
      const batteryData = productCounts.find((p: any) => p.category === 'BATTERY_MODULE');
      if (batteryData) {
        newProgress.push({
          category: 'Batteries',
          current: Math.min(batteryData.total_count || 0, 513),
          target: 513,
          percentage: Math.min(100, Math.round(((batteryData.total_count || 0) / 513) * 100))
        });
      } else {
        newProgress.push({
          category: 'Batteries',
          current: 0,
          target: 513,
          percentage: 0
        });
      }

      // Inverter progress
      const inverterData = productCounts.find((p: any) => p.category === 'INVERTER');
      if (inverterData) {
        newProgress.push({
          category: 'Inverters',
          current: Math.min(inverterData.total_count || 0, 200),
          target: 200,
          percentage: Math.min(100, Math.round(((inverterData.total_count || 0) / 200) * 100))
        });
      } else {
        newProgress.push({
          category: 'Inverters',
          current: 0,
          target: 200,
          percentage: 0
        });
      }

      console.log('📈 Calculated progress:', newProgress);
      setProgress(newProgress);

    } catch (error) {
      console.error('❌ Failed to load status:', error);
    }
  }

  async function startScraping() {
    console.log('🚀 START SCRAPING CLICKED!');
    setLoading(true);
    
    try {
      console.log('🔄 Attempting to start scraping...');
      
      // Check if function exists by calling status first
      const statusResponse = await supabase.functions.invoke('cec-comprehensive-scraper', {
        body: { action: 'status' }
      });
      
      console.log('📊 Status check response:', statusResponse);
      
      if (statusResponse.error) {
        console.error('❌ Status check failed:', statusResponse.error);
        throw new Error(`Function error: ${statusResponse.error.message}`);
      }
      
      // Reset any stuck jobs
      console.log('🔄 Resetting any stuck jobs...');
      const resetResponse = await supabase.functions.invoke('cec-comprehensive-scraper', {
        body: { action: 'reset' }
      });
      
      console.log('🔄 Reset response:', resetResponse);
      
      if (resetResponse.error) {
        console.error('❌ Reset failed:', resetResponse.error);
        // Continue anyway, might not be critical
      }

      // Wait a moment then start fresh
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('🆕 Starting fresh scraping job...');
      const startResponse = await supabase.functions.invoke('cec-comprehensive-scraper', {
        body: { action: 'start' }
      });
      
      console.log('✅ Start response:', startResponse);

      if (startResponse.error) {
        console.error('❌ Start failed:', startResponse.error);
        throw new Error(`Start failed: ${startResponse.error.message}`);
      }

      if (startResponse.data?.job_id) {
        setJob({ id: startResponse.data.job_id, status: 'running' });
        localStorage.setItem('scrape_job_id', startResponse.data.job_id);
      }

      toast({
        title: "Scraping Started",
        description: "Scraping job initiated successfully",
      });

      // Immediately refresh status
      setTimeout(loadCurrentStatus, 2000);

    } catch (error) {
      console.error('❌ Complete start failure:', error);
      toast({
        title: "Start Failed",
        description: `Failed to start scraping: ${(error as Error).message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }

  async function resetScraping() {
    if (!confirm('⚠️ Reset all scraping jobs and restart inverter processing?')) return;
    
    setLoading(true);
    try {
      // First reset the job
      const { error: resetError } = await supabase.functions.invoke('cec-comprehensive-scraper', {
        body: { action: 'reset' }
      });

      if (resetError) {
        console.error('❌ Reset error:', resetError);
      }

      // Wait a moment then start fresh
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Start new job which will now properly process inverters
      const { error: startError } = await supabase.functions.invoke('cec-comprehensive-scraper', {
        body: { action: 'start' }
      });

      if (startError) throw startError;

      setJob(null);
      setProgress([]);
      localStorage.removeItem('scrape_job_id');

      toast({
        title: "Jobs Reset & Restarted",
        description: "Fresh scraping job started with inverter web search enabled"
      });

      // Immediately refresh status
      setTimeout(loadCurrentStatus, 3000);

    } catch (error) {
      console.error('❌ Reset failed:', error);
      toast({
        title: "Reset Failed",
        description: (error as Error).message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }

  async function stopJob() {
    if (!confirm('⚠️ Stop the current scraping job?')) return;
    
    setLoading(true);
    try {
      // Reset the job to stop it
      const { error: resetError } = await supabase.functions.invoke('cec-comprehensive-scraper', {
        body: { action: 'reset' }
      });

      if (resetError) {
        console.error('❌ Stop error:', resetError);
        throw resetError;
      }

      setJob(null);
      setProgress([]);
      localStorage.removeItem('scrape_job_id');

      toast({
        title: "Job Stopped",
        description: "Scraping job stopped successfully"
      });

      // Refresh status to confirm stop
      setTimeout(loadCurrentStatus, 1000);

    } catch (error) {
      console.error('❌ Stop failed:', error);
      toast({
        title: "Stop Failed",
        description: (error as Error).message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }

  const isRunning = job?.status === 'running';

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Database className="w-5 h-5" />
          Data Collection Status
          {isRunning && <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Control Buttons */}
        <div className="flex gap-2">
          {!isRunning ? (
            <>
              <Button
                onClick={startScraping}
                disabled={loading}
                size="sm"
                className="flex-1"
              >
                <Play className="w-3 h-3 mr-1" />
                {loading ? 'Starting...' : 'Start Scraping'}
              </Button>
              <Button
                onClick={resetScraping}
                disabled={loading}
                variant="outline"
                size="sm"
              >
                <RotateCcw className="w-3 h-3" />
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={stopJob}
                disabled={loading}
                size="sm"
                variant="destructive"
                className="flex-1"
              >
                <StopCircle className="w-3 h-3 mr-1" />
                {loading ? 'Stopping...' : 'Stop Job'}
              </Button>
              <Button
                onClick={resetScraping}
                disabled={loading}
                variant="outline"
                size="sm"
                title="Reset and restart job"
              >
                <RotateCcw className="w-3 h-3" />
              </Button>
            </>
          )}
        </div>

        {/* Job Info */}
        {job && (
          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
            <div>Job: {job.id.slice(0, 8)}...</div>
            <div>Status: <span className={`font-medium ${isRunning ? 'text-blue-600' : 'text-gray-600'}`}>{job.status}</span></div>
          </div>
        )}

        {/* Progress Display */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Collection Progress</h4>
          {progress.length > 0 ? (
            progress.map((item) => (
              <div key={item.category} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{item.category}</span>
                  <span className="text-muted-foreground">
                    {item.current} / {item.target} ({item.percentage}%)
                  </span>
                </div>
                <Progress value={item.percentage} className="h-2" />
              </div>
            ))
          ) : (
            <div className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded">
              No data collected yet. Click "Start Scraping" to begin.
            </div>
          )}
        </div>

        {/* Debug Info */}
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground">Debug Info</summary>
          <pre className="mt-2 p-2 bg-muted/50 rounded text-[10px] overflow-auto">
            Job: {JSON.stringify(job, null, 2)}
            Progress: {JSON.stringify(progress, null, 2)}
          </pre>
        </details>
      </CardContent>
    </Card>
  );
}