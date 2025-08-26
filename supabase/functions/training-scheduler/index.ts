import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AutomationConfig {
  enabled: boolean;
  scheduleType: 'daily' | 'weekly' | 'data_driven' | 'performance_driven';
  scheduleTime: string;
  weekday: string;
  triggerConditions: {
    dataFreshness: boolean;
    performanceThreshold: boolean;
    minimumInterval: number;
  };
  autoRetry: boolean;
  maxRetries: number;
}

interface ScheduledJob {
  id: string;
  config: AutomationConfig;
  nextRun: string;
  status: 'active' | 'paused' | 'completed';
  retryCount: number;
  lastRun?: string;
  lastRunStatus: 'success' | 'failed' | 'pending';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, config, jobId } = await req.json();
    console.log(`🤖 Training Scheduler action: ${action}`);

    switch (action) {
      case 'create_schedule':
        return await createSchedule(supabase, config);
      
      case 'update_schedule':
        return await updateSchedule(supabase, jobId, config);
      
      case 'get_schedules':
        return await getSchedules(supabase);
      
      case 'delete_schedule':
        return await deleteSchedule(supabase, jobId);
      
      case 'check_triggers':
        return await checkTriggers(supabase);
      
      case 'get_status':
        return await getAutomationStatus(supabase);
        
      case 'manual_trigger':
        return await triggerTraining(supabase, 'manual');
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('❌ Training scheduler error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function createSchedule(supabase: any, config: AutomationConfig) {
  const jobId = crypto.randomUUID();
  const nextRun = calculateNextRun(config);
  
  const { error } = await supabase
    .from('automation_schedules')
    .insert({
      id: jobId,
      config,
      next_run: nextRun,
      status: 'active',
      retry_count: 0,
      created_at: new Date().toISOString()
    });

  if (error) throw error;

  console.log(`✅ Created automation schedule: ${jobId}`);
  
  return new Response(
    JSON.stringify({ 
      success: true, 
      jobId,
      nextRun 
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function updateSchedule(supabase: any, jobId: string, config: AutomationConfig) {
  const nextRun = calculateNextRun(config);
  
  const { error } = await supabase
    .from('automation_schedules')
    .update({
      config,
      next_run: nextRun,
      updated_at: new Date().toISOString()
    })
    .eq('id', jobId);

  if (error) throw error;

  console.log(`✅ Updated automation schedule: ${jobId}`);
  
  return new Response(
    JSON.stringify({ 
      success: true, 
      nextRun 
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getSchedules(supabase: any) {
  const { data: schedules, error } = await supabase
    .from('automation_schedules')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return new Response(
    JSON.stringify({ 
      success: true, 
      schedules 
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function deleteSchedule(supabase: any, jobId: string) {
  const { error } = await supabase
    .from('automation_schedules')
    .update({ status: 'completed' })
    .eq('id', jobId);

  if (error) throw error;

  console.log(`✅ Deleted automation schedule: ${jobId}`);
  
  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function checkTriggers(supabase: any) {
  console.log('🔍 Checking automation triggers...');
  
  const { data: schedules, error } = await supabase
    .from('automation_schedules')
    .select('*')
    .eq('status', 'active');

  if (error) throw error;

  const triggeredJobs: string[] = [];
  const now = new Date();

  for (const schedule of schedules) {
    const config: AutomationConfig = schedule.config;
    let shouldTrigger = false;
    const triggers: string[] = [];

    // Check if enough time has passed since last run
    if (schedule.last_run) {
      const lastRun = new Date(schedule.last_run);
      const hoursSinceLastRun = (now.getTime() - lastRun.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceLastRun < config.triggerConditions.minimumInterval) {
        continue; // Too soon since last run
      }
    }

    // Check scheduled time trigger
    if (config.scheduleType === 'daily' || config.scheduleType === 'weekly') {
      const nextRun = new Date(schedule.next_run);
      
      if (now >= nextRun) {
        shouldTrigger = true;
        triggers.push('scheduled_time');
      }
    }

    // Check data freshness trigger
    if (config.triggerConditions.dataFreshness && config.scheduleType === 'data_driven') {
      const { data: tracking } = await supabase
        .from('data_update_tracking')
        .select('last_updated')
        .order('last_updated', { ascending: false })
        .limit(1);
        
      if (tracking && tracking.length > 0) {
        const lastUpdate = new Date(tracking[0].last_updated);
        const hoursOld = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
        
        if (hoursOld < 2) { // Data updated within last 2 hours
          shouldTrigger = true;
          triggers.push('data_updated');
        }
      }
    }

    // Check performance threshold trigger
    if (config.triggerConditions.performanceThreshold && config.scheduleType === 'performance_driven') {
      const { data: metrics } = await supabase
        .from('training_metrics')
        .select('value')
        .eq('metric_type', 'accuracy')
        .order('created_at', { ascending: false })
        .limit(10);
        
      if (metrics && metrics.length > 0) {
        const avgAccuracy = metrics.reduce((sum: number, m: any) => sum + m.value, 0) / metrics.length;
        if (avgAccuracy < 0.85) { // Below 85% accuracy threshold
          shouldTrigger = true;
          triggers.push('performance_degraded');
        }
      }
    }

    if (shouldTrigger) {
      console.log(`🎯 Triggering training for schedule ${schedule.id}: ${triggers.join(', ')}`);
      
      try {
        await triggerTraining(supabase, triggers.join(','), schedule.id);
        triggeredJobs.push(schedule.id);
        
        // Update schedule
        await supabase
          .from('automation_schedules')
          .update({
            last_run: now.toISOString(),
            last_run_status: 'pending',
            retry_count: 0,
            next_run: calculateNextRun(config)
          })
          .eq('id', schedule.id);
          
      } catch (error) {
        console.error(`❌ Failed to trigger training for ${schedule.id}:`, error);
        
        // Handle retry logic
        if (config.autoRetry && schedule.retry_count < config.maxRetries) {
          await supabase
            .from('automation_schedules')
            .update({
              retry_count: schedule.retry_count + 1,
              next_run: new Date(now.getTime() + 30 * 60 * 1000).toISOString() // Retry in 30 minutes
            })
            .eq('id', schedule.id);
        }
      }
    }
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      triggeredJobs,
      message: `Checked ${schedules.length} schedules, triggered ${triggeredJobs.length} jobs`
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function triggerTraining(supabase: any, triggers: string, scheduleId?: string) {
  console.log(`🚀 Triggering automated training: ${triggers}`);
  
  // Call the training orchestrator
  const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/training-orchestrator`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'start_master_training',
      config: {
        episodes: 10000,
        batchSize: 500,
        skipPDFProcessing: false,
        skipMultitaskTraining: false,
        skipLegacyTraining: false,
        automated: true,
        triggers: triggers.split(','),
        scheduleId
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Training orchestrator failed: ${response.statusText}`);
  }

  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Training failed to start');
  }

  // Log the automation event
  await supabase
    .from('automation_logs')
    .insert({
      schedule_id: scheduleId,
      trigger_reason: triggers,
      session_id: result.sessionId,
      status: 'triggered',
      created_at: new Date().toISOString()
    });

  return result;
}

async function getAutomationStatus(supabase: any) {
  const { data: schedules } = await supabase
    .from('automation_schedules')
    .select('*')
    .eq('status', 'active');

  const { data: logs } = await supabase
    .from('automation_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  const { data: sessions } = await supabase
    .from('orchestrator_sessions')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(5);

  return new Response(
    JSON.stringify({ 
      success: true, 
      schedules: schedules || [],
      recentLogs: logs || [],
      recentSessions: sessions || []
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

function calculateNextRun(config: AutomationConfig): string {
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
  } else {
    // For data-driven or performance-driven, check every hour
    nextRun.setTime(now.getTime() + 60 * 60 * 1000);
  }

  return nextRun.toISOString();
}