import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TARGETS = {
  PANEL: 1348,
  BATTERY_MODULE: 513,
  INVERTER: 200
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action } = await req.json();
    console.log(`🚀 Job Orchestration Action: ${action}`);

    switch (action) {
      case 'start':
        return await startJob(supabase);
      case 'status': 
        return await getJobStatus(supabase);
      case 'tick':
        return await tickJob(supabase);
      case 'reset':
        return await resetJobs(supabase);
      case 'check_readiness':
        return await checkReadiness(supabase);
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function startJob(supabase: any) {
  console.log('🚀 Starting new scraping job...');
  
  try {
    // Check for existing running jobs
    const { data: existingJobs } = await supabase
      .from('scrape_jobs')
      .select('id, status')
      .in('status', ['queued', 'running'])
      .limit(1);

    if (existingJobs && existingJobs.length > 0) {
      console.log('⚠️ Job already running:', existingJobs[0].id);
      return new Response(
        JSON.stringify({
          success: true,
          job_id: existingJobs[0].id,
          status: existingJobs[0].status,
          message: 'Job already running'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create new job
    const { data: job, error: jobError } = await supabase
      .from('scrape_jobs')
      .insert({
        status: 'running',
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (jobError) throw jobError;

    // Create progress entries for all three categories
    const progressEntries = [
      { job_id: job.id, category: 'PANEL', target: TARGETS.PANEL, state: 'running' },
      { job_id: job.id, category: 'BATTERY_MODULE', target: TARGETS.BATTERY_MODULE, state: 'running' },
      { job_id: job.id, category: 'INVERTER', target: TARGETS.INVERTER, state: 'running' }
    ];

    const { error: progressError } = await supabase
      .from('scrape_job_progress')
      .insert(progressEntries);

    if (progressError) throw progressError;

    console.log('✅ Job started:', job.id);
    return new Response(
      JSON.stringify({
        success: true,
        job_id: job.id,
        status: 'running',
        message: 'Scraping job started successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Start job error:', error);
    throw error;
  }
}

async function getJobStatus(supabase: any) {
  console.log('📊 Getting job status...');
  
  try {
    // Get latest job
    const { data: job } = await supabase
      .from('scrape_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!job) {
      return new Response(
        JSON.stringify({
          success: true,
          job: null,
          progress: [],
          productCounts: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get progress for this job
    const { data: progress } = await supabase
      .from('scrape_job_progress')
      .select('*')
      .eq('job_id', job.id)
      .order('category', { ascending: true });

    // Get product counts
    const { data: productCounts } = await supabase
      .rpc('get_product_counts_by_category');

    console.log('✅ Job status retrieved');
    return new Response(
      JSON.stringify({
        success: true,
        job,
        progress: progress || [],
        productCounts: productCounts || []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Status error:', error);
    throw error;
  }
}

async function tickJob(supabase: any) {
  console.log('⚙️ Ticking job...');
  
  try {
    // Get current running job
    const { data: job } = await supabase
      .from('scrape_jobs')
      .select('*')
      .eq('status', 'running')
      .single();

    if (!job) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No running job found'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process a small batch for each category
    await processBatch(supabase, job.id, 'PANEL', 10);
    await processBatch(supabase, job.id, 'BATTERY_MODULE', 10);
    await processBatch(supabase, job.id, 'INVERTER', 10);

    // Check if job is complete
    const { data: progress } = await supabase
      .from('scrape_job_progress')
      .select('*')
      .eq('job_id', job.id);

    const allComplete = progress?.every(p => p.state === 'completed');
    
    if (allComplete) {
      await supabase
        .from('scrape_jobs')
        .update({ 
          status: 'completed', 
          finished_at: new Date().toISOString() 
        })
        .eq('id', job.id);
    }

    console.log('✅ Job tick completed');
    return new Response(
      JSON.stringify({
        success: true,
        job_complete: allComplete,
        progress
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Tick job error:', error);
    throw error;
  }
}

async function resetJobs(supabase: any) {
  console.log('💥 Resetting all jobs...');
  
  try {
    // Cancel running jobs
    await supabase
      .from('scrape_jobs')
      .update({
        status: 'canceled',
        finished_at: new Date().toISOString()
      })
      .in('status', ['queued', 'running']);

    // Clear all progress
    await supabase
      .from('scrape_job_progress')
      .delete()
      .neq('job_id', '00000000-0000-0000-0000-000000000000');

    // Clear products (optional - comment out if you want to keep existing data)
    await supabase
      .from('products')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    console.log('✅ Reset completed');
    return new Response(
      JSON.stringify({
        success: true,
        message: 'All jobs and data reset successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Reset error:', error);
    throw error;
  }
}

async function checkReadiness(supabase: any) {
  console.log('🔍 Checking readiness gates...');
  
  try {
    const { data, error } = await supabase
      .rpc('check_readiness_gates');

    if (error) throw error;

    console.log('✅ Readiness check completed');
    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Readiness check error:', error);
    throw error;
  }
}

// Process a batch of items for a category
async function processBatch(supabase: any, jobId: string, category: string, batchSize: number) {
  console.log(`🔄 Processing batch for ${category}...`);
  
  try {
    // Get current progress
    const { data: progress } = await supabase
      .from('scrape_job_progress')
      .select('*')
      .eq('job_id', jobId)
      .eq('category', category)
      .single();

    if (!progress || progress.state === 'completed') {
      return;
    }

    // Mock processing - simulate finding and processing items
    const target = progress.target;
    const processed = progress.processed;
    const remaining = target - processed;
    
    if (remaining <= 0) {
      // Mark as completed
      await supabase
        .from('scrape_job_progress')
        .update({ state: 'completed' })
        .eq('job_id', jobId)
        .eq('category', category);
      return;
    }

    // Process a small batch
    const toProcess = Math.min(batchSize, remaining);
    const newProcessed = processed + toProcess;
    const newPdfDone = Math.floor(newProcessed * 0.8); // 80% have PDFs
    const newSpecsDone = Math.floor(newProcessed * 0.7); // 70% have complete specs

    // Create mock products for demonstration
    const mockProducts = [];
    for (let i = 0; i < toProcess; i++) {
      mockProducts.push({
        category,
        manufacturer_id: null, // Will need proper manufacturer
        model: `Mock ${category} Model ${processed + i + 1}`,
        source: 'CEC_MOCK'
      });
    }

    // Insert mock products (in real implementation, this would be actual CEC data)
    if (mockProducts.length > 0) {
      const { error: insertError } = await supabase
        .from('products')
        .insert(mockProducts);
      
      if (insertError) {
        console.error('Insert error:', insertError);
      }
    }

    // Update progress
    await supabase
      .from('scrape_job_progress')
      .update({
        processed: newProcessed,
        pdf_done: newPdfDone,
        specs_done: newSpecsDone,
        state: newProcessed >= target ? 'completed' : 'running'
      })
      .eq('job_id', jobId)
      .eq('category', category);

    console.log(`✅ Processed ${toProcess} items for ${category}`);
  } catch (error) {
    console.error(`❌ Batch processing error for ${category}:`, error);
  }
}
