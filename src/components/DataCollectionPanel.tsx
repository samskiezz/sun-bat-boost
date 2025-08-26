'use client';
import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { adaptStatus, ProgressRow, Cat } from '@/lib/progress-adapter';
import { useToast } from '@/hooks/use-toast';

const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rZ2NhY3VoZHdwc2ZrYmd1ZGRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMjIwNzcsImV4cCI6MjA3MTY5ODA3N30.rtp0L8COz3XcmEzGqElLs-d08qHnZDbPr0ZWmyqq8Ms";

type Status = { job?: { id: string; status: string }, progress: ProgressRow[] };

function Bar({ label, num, den }: { label: string; num: number; den: number }) {
  const pct = Math.max(0, Math.min(100, den ? Math.floor((num / den) * 100) : 0));
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs md:text-sm text-slate-100/90">
        <span>{label}</span>
        <span className="tabular-nums">{num} / {den} ({pct}%)</span>
      </div>
      <div className="h-2 w-full rounded-full bg-white/20 overflow-hidden">
        <div
          className="h-2 rounded-full bg-white/80 transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

const pretty: Record<Cat,string> = {
  PANEL: 'Panels',
  BATTERY_MODULE: 'Battery Modules',
  INVERTER: 'Inverters',
};

export default function DataCollectionPanel() {
  const [jobId, setJobId] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<Status | null>(null);
  const [busy, setBusy] = React.useState(false);
  const { toast } = useToast();
  const running = status?.job?.status === 'running';

  React.useEffect(() => {
    const saved = localStorage.getItem('scrape_job_id');
    if (saved) setJobId(saved);
  }, []);

  React.useEffect(() => {
    let stop = false;
    let timer: any;

    async function tickOnce() {
      try {
        await fetch('/functions/v1/cec-comprehensive-scraper', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ action: 'tick' })
        });
      } catch (e) {
        console.error('tick error', e);
      }
    }
    
    async function poll() {
      if (stop) return;
      try {
        const response = await fetch('/functions/v1/cec-comprehensive-scraper', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ action: 'status' })
        });
        
        const data = await response.json();
        console.log('📊 Poll status:', data);
        
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
    console.log('🚀 START FUNCTION CALLED');
    setBusy(true);
    try {
      console.log('🚀 Starting scraper...');
      
      // First try to get current status to see if job is already running
      const statusResponse = await fetch('/functions/v1/cec-comprehensive-scraper', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ action: 'status' })
      });
      
      const statusData = await statusResponse.json();
      console.log('📊 Status check response:', statusData);
      
      if (statusData?.job?.status === 'running') {
        console.log('⚠️ Job already running, using existing job');
        setJobId(statusData.job.id);
        localStorage.setItem('scrape_job_id', statusData.job.id);
        toast({
          title: "Job Already Running",
          description: "A scraping job is already in progress.",
        });
        return;
      }
      
      // Start new job
      const startResponse = await fetch('/functions/v1/cec-comprehensive-scraper', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ action: 'start' })
      });
      
      const startData = await startResponse.json();
      console.log('📊 Start response:', startData);
      
      if (!startResponse.ok) {
        throw new Error(startData.error || 'Failed to start scraper');
      }
      
      const newJobId = startData?.job_id || startData?.id;
      console.log('🔍 Extracted job_id:', newJobId);
      
      if (!newJobId) {
        console.error('❌ No job_id in response. Full data:', startData);
        throw new Error('No job_id returned from scraper');
      }
      
      console.log('💾 Saving job_id to localStorage:', newJobId);
      localStorage.setItem('scrape_job_id', newJobId);
      setJobId(newJobId);
      
      toast({
        title: "Scraping Started",
        description: "Data collection job has been initiated successfully.",
      });
      
    } catch (e) {
      console.error('❌ Start scraper error:', e);
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
    const confirmed = window.confirm(
      '⚠️ This will cancel all jobs and clear data. Are you sure?'
    );
    if (!confirmed) return;
    
    setBusy(true);
    try {
      const response = await fetch('/functions/v1/cec-comprehensive-scraper', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ action: 'reset' })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Reset failed');
      }
      
      localStorage.removeItem('scrape_job_id');
      setJobId(null);
      setStatus(null);
      
      toast({
        title: "Reset Complete",
        description: "All jobs have been reset and data cleared.",
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

  async function checkReadiness() {
    try {
      const response = await fetch('/functions/v1/cec-comprehensive-scraper', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ action: 'check_readiness' })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Readiness check failed');
      }
      
      const ok = data?.allPassing;
      toast({
        title: ok ? "Readiness Check Passed" : "Readiness Check Failed",
        description: data?.message || 'Check console for details',
        variant: ok ? "default" : "destructive",
      });
      console.log('readiness', data);
    } catch (e) {
      toast({
        title: "Readiness Check Failed",
        description: (e as Error).message,
        variant: "destructive",
      });
    }
  }

  const rows: ProgressRow[] = status?.progress ?? [];
  const order: Cat[] = ['PANEL','BATTERY_MODULE','INVERTER'];

  return (
    <div className="relative">
      {/* Glassmorphic card */}
      <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl p-5 md:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <h2 className="text-xl md:text-2xl font-semibold text-white drop-shadow">Comprehensive Catalog Manager</h2>
          <div className="flex gap-2">
            <button
              onClick={() => {
                console.log('🟢 DATA COLLECTION BUTTON CLICKED');
                start();
              }}
              disabled={busy || running}
              className={`px-3 py-2 rounded-md text-white ${running ? 'bg-slate-500' : 'bg-blue-600 hover:bg-blue-700'} transition`}
            >
              {running ? 'Running…' : busy ? 'Starting…' : 'Start Scraping'}
            </button>
            <button
              onClick={reset}
              disabled={busy || running}
              className="px-3 py-2 rounded-md text-white bg-rose-600 hover:bg-rose-700 transition"
            >
              {busy ? 'Resetting…' : 'Complete Reset'}
            </button>
            <button
              onClick={checkReadiness}
              className="px-3 py-2 rounded-md text-white bg-emerald-600 hover:bg-emerald-700 transition"
            >
              Check Readiness
            </button>
          </div>
        </div>

        <div className="text-xs md:text-sm text-slate-100/80 mb-3">
          Job: <span className="font-mono">{status?.job?.id ?? '—'}</span> • Status: <span className="font-medium">{status?.job?.status ?? '—'}</span>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {order.map(cat => {
            const r = rows.find(x => x.category === cat);
            const state = r?.state ?? 'pending';
            const badge =
              state === 'completed' ? 'bg-emerald-400/30 text-emerald-100'
              : state === 'failed' ? 'bg-rose-400/30 text-rose-100'
              : state === 'processing' ? 'bg-blue-400/30 text-blue-100'
              : 'bg-slate-200/30 text-slate-100';

            return (
              <div key={cat} className="rounded-xl border border-white/20 bg-white/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-white/95 font-medium">{pretty[cat]}</div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${badge}`}>{state}</span>
                </div>
                <Bar label="Processed"  num={r?.processed ?? 0}  den={r?.target ?? 0} />
                <Bar label="Specs"      num={r?.specs_done ?? 0} den={r?.target ?? 0} />
                <Bar label="PDFs"       num={r?.pdf_done ?? 0}   den={r?.target ?? 0} />
              </div>
            );
          })}
        </div>

        {!status && (
          <div className="mt-4 text-slate-100/70 text-sm">
            Click <span className="font-medium text-white">Start Scraping</span> to begin. Progress appears for Panels, Battery Modules, and Inverters.
          </div>
        )}
      </div>
    </div>
  );
}