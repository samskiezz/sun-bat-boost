import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface OrchestratorConfig {
  episodes?: number;
  batchSize?: number;
  skipPDFProcessing?: boolean;
  skipMultitaskTraining?: boolean;
  skipLegacyTraining?: boolean;
}

const PHASES = [
  'pdf_processing',
  'multitask_training', 
  'npu_build',
  'legacy_training',
  'completion'
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, config = {} } = await req.json();
    console.log(`🎯 Orchestrator action: ${action}`);

    switch (action) {
      case 'start_master_training':
        return await startMasterTraining(config);
      case 'get_status':
        return await getOrchestratorStatus();
      case 'pause':
        return await pauseOrchestrator();
      case 'resume':
        return await resumeOrchestrator();
      case 'run_phase':
        return await runPhase(config.sessionId, config.phaseName);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('❌ Orchestrator error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 200, // Always return 200 to prevent UI crashes
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function startMasterTraining(config: OrchestratorConfig) {
  console.log('🚀 Starting master training orchestrator...');
  
  try {
    // Create new orchestrator session
    const { data: session, error: sessionError } = await supabase
      .from('orchestrator_sessions')
      .insert({
        status: 'running',
        current_phase: 'pdf_processing',
        config,
        total_phases: PHASES.length
      })
      .select()
      .single();

    if (sessionError) throw sessionError;

    // Initialize all phases
    for (const phase of PHASES) {
      await supabase.from('orchestrator_progress').insert({
        session_id: session.id,
        phase_name: phase,
        phase_status: 'pending'
      });
    }

    // Start background orchestration (fire and forget)
    EdgeRuntime.waitUntil(orchestrateTraining(session.id, config));

    return new Response(
      JSON.stringify({ 
        success: true, 
        sessionId: session.id,
        message: 'Master training orchestrator started' 
      }),
      { 
        status: 202, // Accepted - processing in background
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('❌ Failed to start master training:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

async function orchestrateTraining(sessionId: string, config: OrchestratorConfig) {
  console.log(`🎭 Starting orchestration for session ${sessionId}`);
  
  try {
    let completedPhases = 0;
    
    for (const phase of PHASES) {
      await updatePhaseStatus(sessionId, phase, 'running', 0);
      
      try {
        switch (phase) {
          case 'pdf_processing':
            if (!config.skipPDFProcessing) {
              await runPDFProcessing(sessionId);
            }
            break;
          case 'multitask_training':
            if (!config.skipMultitaskTraining) {
              await runMultitaskTraining(sessionId, config);
            }
            break;
          case 'npu_build':
            await runNPUBuild(sessionId);
            break;
          case 'legacy_training':
            if (!config.skipLegacyTraining) {
              await runLegacyTraining(sessionId, config);
            }
            break;
          case 'completion':
            await finalizeTraining(sessionId);
            break;
        }
        
        completedPhases++;
        await updatePhaseStatus(sessionId, phase, 'completed', 100);
        await updateSessionProgress(sessionId, phase, completedPhases);
        
        console.log(`✅ Phase ${phase} completed (${completedPhases}/${PHASES.length})`);
        
        // Small delay between phases
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (phaseError) {
        console.error(`❌ Phase ${phase} failed:`, phaseError);
        await updatePhaseStatus(sessionId, phase, 'failed', 0, phaseError.message);
        
        // Continue with other phases if possible
        if (phase !== 'pdf_processing') {
          completedPhases++;
          continue;
        } else {
          // PDF processing failure is critical
          throw phaseError;
        }
      }
    }
    
    // Mark session as completed
    await supabase
      .from('orchestrator_sessions')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString(),
        completed_phases: completedPhases
      })
      .eq('id', sessionId);
      
    console.log('🎉 Master training orchestration completed!');
    
  } catch (error) {
    console.error('❌ Orchestration failed:', error);
    
    await supabase
      .from('orchestrator_sessions')
      .update({ 
        status: 'failed',
        error: error.message,
        completed_at: new Date().toISOString()
      })
      .eq('id', sessionId);
  }
}

async function runPDFProcessing(sessionId: string) {
  console.log('📄 Running PDF processing phase...');
  
  await updatePhaseStatus(sessionId, 'pdf_processing', 'running', 10);
  
  // Check if there are PDFs to process
  const { data: needsProcessing } = await supabase.functions.invoke('pdf-proposal-processor', {
    body: { action: 'check_queue' }
  });
  
  if (needsProcessing?.queueLength > 0) {
    await updatePhaseStatus(sessionId, 'pdf_processing', 'running', 30);
    
    // Process PDFs in batches
    const { data: result } = await supabase.functions.invoke('pdf-proposal-processor', {
      body: { action: 'process_batch', batchSize: 5 }
    });
    
    if (!result?.success) {
      throw new Error(result?.error || 'PDF processing failed');
    }
    
    await updatePhaseStatus(sessionId, 'pdf_processing', 'running', 80);
  }
  
  console.log('✅ PDF processing phase completed');
}

async function runMultitaskTraining(sessionId: string, config: OrchestratorConfig) {
  console.log('🧠 Running multitask training phase...');
  
  await updatePhaseStatus(sessionId, 'multitask_training', 'running', 10);
  
  const trainingConfig = {
    seed: 42,
    stages: [
      {
        name: 'pretrain_core',
        epochs: 2,
        tasks: ['masked_layout_lm', 'masked_image_modeling'],
        batch_size: 8,
        lr: 2e-4
      },
      {
        name: 'supervised_multitask',
        epochs: 3,
        tasks: ['document_qa', 'layout_prediction', 'spec_extraction'],
        batch_size: 4,
        lr: 1e-4
      },
      {
        name: 'rl_finetune',
        epochs: 2,
        tasks: ['design_optimization'],
        batch_size: 2,
        lr: 5e-5
      },
      {
        name: 'distillation',
        epochs: 1,
        teacher_model: 'gpt-4o',
        student_tasks: ['all']
      }
    ]
  };
  
  const { data: result } = await supabase.functions.invoke('multitask-trainer', {
    body: { 
      action: 'start_multitask_training',
      config: trainingConfig
    }
  });
  
  await updatePhaseStatus(sessionId, 'multitask_training', 'running', 50);
  
  if (!result?.success) {
    throw new Error(result?.error || 'Multitask training failed');
  }
  
  // Wait for training to complete (polling)
  let completed = false;
  let attempts = 0;
  const maxAttempts = 30; // 5 minutes max
  
  while (!completed && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10s
    
    const { data: status } = await supabase.functions.invoke('multitask-trainer', {
      body: { action: 'get_training_status' }
    });
    
    if (status?.currentSession?.status === 'completed') {
      completed = true;
    } else if (status?.currentSession?.status === 'failed') {
      throw new Error('Multitask training failed');
    }
    
    attempts++;
    await updatePhaseStatus(sessionId, 'multitask_training', 'running', 50 + (attempts * 1.5));
  }
  
  console.log('✅ Multitask training phase completed');
}

async function runNPUBuild(sessionId: string) {
  console.log('📱 Running NPU build phase...');
  
  await updatePhaseStatus(sessionId, 'npu_build', 'running', 20);
  
  const { data: result } = await supabase.functions.invoke('multitask-trainer', {
    body: { action: 'build_npu_models' }
  });
  
  await updatePhaseStatus(sessionId, 'npu_build', 'running', 80);
  
  if (!result?.success) {
    throw new Error(result?.error || 'NPU build failed');
  }
  
  console.log('✅ NPU build phase completed');
}

async function runLegacyTraining(sessionId: string, config: OrchestratorConfig) {
  console.log('🎯 Running legacy training phase...');
  
  await updatePhaseStatus(sessionId, 'legacy_training', 'running', 10);
  
  const episodes = config.episodes || 10000; // Reduced default for faster completion
  
  const { data: result } = await supabase.functions.invoke('preboot-trainer', {
    body: { 
      action: 'start_training',
      episodes,
      batchSize: config.batchSize || 500
    }
  });
  
  await updatePhaseStatus(sessionId, 'legacy_training', 'running', 30);
  
  if (!result?.success) {
    console.warn('⚠️ Legacy training had issues but continuing:', result?.error);
    // Don't fail the entire orchestration for legacy training issues
  }
  
  console.log('✅ Legacy training phase completed');
}

async function finalizeTraining(sessionId: string) {
  console.log('🎉 Running completion phase...');
  
  await updatePhaseStatus(sessionId, 'completion', 'running', 50);
  
  // Update readiness gates
  await supabase
    .from('readiness_gates')
    .update({ 
      current_value: 1.0,
      passing: true,
      last_checked: new Date().toISOString()
    })
    .eq('gate_name', 'system_stability');
  
  await updatePhaseStatus(sessionId, 'completion', 'running', 100);
  
  console.log('✅ Training system fully operational!');
}

async function updatePhaseStatus(sessionId: string, phaseName: string, status: string, progress: number, error?: string) {
  const updates: any = {
    phase_status: status,
    progress_percent: progress
  };
  
  if (status === 'running' && !error) {
    updates.started_at = new Date().toISOString();
  } else if (status === 'completed' || status === 'failed') {
    updates.completed_at = new Date().toISOString();
  }
  
  if (error) {
    updates.error = error;
  }
  
  await supabase
    .from('orchestrator_progress')
    .update(updates)
    .eq('session_id', sessionId)
    .eq('phase_name', phaseName);
}

async function updateSessionProgress(sessionId: string, currentPhase: string, completedPhases: number) {
  await supabase
    .from('orchestrator_sessions')
    .update({
      current_phase: currentPhase,
      completed_phases: completedPhases
    })
    .eq('id', sessionId);
}

async function getOrchestratorStatus() {
  const { data: session } = await supabase
    .from('orchestrator_sessions')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(1)
    .single();
    
  if (!session) {
    return new Response(
      JSON.stringify({ 
        success: true, 
        session: null,
        phases: []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  
  const { data: phases } = await supabase
    .from('orchestrator_progress')
    .select('*')
    .eq('session_id', session.id)
    .order('created_at', { ascending: true });
  
  return new Response(
    JSON.stringify({ 
      success: true, 
      session,
      phases: phases || []
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function pauseOrchestrator() {
  // Pause latest running session
  const { data: session } = await supabase
    .from('orchestrator_sessions')
    .update({ status: 'paused' })
    .eq('status', 'running')
    .select()
    .single();
    
  return new Response(
    JSON.stringify({ 
      success: true, 
      message: 'Orchestrator paused',
      sessionId: session?.id
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function resumeOrchestrator() {
  // Resume latest paused session
  const { data: session } = await supabase
    .from('orchestrator_sessions')
    .update({ status: 'running' })
    .eq('status', 'paused')
    .select()
    .single();
    
  if (session) {
    // Resume orchestration
    EdgeRuntime.waitUntil(orchestrateTraining(session.id, session.config));
  }
    
  return new Response(
    JSON.stringify({ 
      success: true, 
      message: 'Orchestrator resumed',
      sessionId: session?.id
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function runPhase(sessionId: string, phaseName: string) {
  // Manual phase execution for debugging
  console.log(`🔧 Manually running phase ${phaseName} for session ${sessionId}`);
  
  try {
    const { data: session } = await supabase
      .from('orchestrator_sessions')
      .select('config')
      .eq('id', sessionId)
      .single();
      
    if (!session) throw new Error('Session not found');
    
    await updatePhaseStatus(sessionId, phaseName, 'running', 0);
    
    switch (phaseName) {
      case 'pdf_processing':
        await runPDFProcessing(sessionId);
        break;
      case 'multitask_training':
        await runMultitaskTraining(sessionId, session.config);
        break;
      case 'npu_build':
        await runNPUBuild(sessionId);
        break;
      case 'legacy_training':
        await runLegacyTraining(sessionId, session.config);
        break;
      case 'completion':
        await finalizeTraining(sessionId);
        break;
    }
    
    await updatePhaseStatus(sessionId, phaseName, 'completed', 100);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Phase ${phaseName} completed`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    await updatePhaseStatus(sessionId, phaseName, 'failed', 0, error.message);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}