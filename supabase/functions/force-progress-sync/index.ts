import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    console.log('🚀 Force syncing job progress with database...');
    
    // Get the most recent job ID
    const { data: jobs } = await supabase
      .from('scrape_jobs')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (!jobs || jobs.length === 0) {
      throw new Error('No jobs found');
    }
    
    const latestJobId = jobs[0].id;
    console.log(`🎯 Using latest job ID: ${latestJobId}`);
    
    // Clean up any duplicate progress entries - keep only the latest job
    const { error: cleanupError } = await supabase
      .from('scrape_job_progress')
      .delete()
      .neq('job_id', latestJobId);
    
    if (cleanupError) {
      console.warn('⚠️ Cleanup warning:', cleanupError);
    } else {
      console.log('🧹 Cleaned up old progress entries');
    }
    
    // Use RPC to get comprehensive specs counts efficiently
    const { data: specCounts } = await supabase.rpc('get_spec_counts_by_category');
    const comprehensiveSpecs = { PANEL: 0, BATTERY_MODULE: 0, INVERTER: 0 };
    
    if (specCounts) {
      specCounts.forEach((row: any) => {
        const category = row.category as keyof typeof comprehensiveSpecs;
        if (category in comprehensiveSpecs) {
          comprehensiveSpecs[category] = row.products_with_6plus_specs || 0;
          console.log(`✅ ${category}: ${comprehensiveSpecs[category]} products with 6+ specs`);
        }
      });
    }
    
    // Update job progress with real data for the latest job
    for (const [category, count] of Object.entries(comprehensiveSpecs)) {
      const target = category === 'PANEL' ? 1348 : category === 'BATTERY_MODULE' ? 513 : 2411;
      const totalProducts = target;
      const isCompleted = count >= target;
      
      await supabase
        .from('scrape_job_progress')
        .upsert({
          job_id: latestJobId,
          category: category,
          target: target,
          specs_done: count,
          processed: totalProducts,
          pdf_done: totalProducts,
          state: isCompleted ? 'completed' : 'running',
          last_specs_trigger: isCompleted ? 0 : Date.now()
        }, {
          onConflict: 'job_id,category'
        });
      
      console.log(`🔄 Updated ${category}: ${count}/${target} comprehensive specs (${isCompleted ? 'COMPLETED' : 'RUNNING'})`);
    }
    
    // Update G3 readiness gates
    const gateUpdates = [
      { name: 'G3_PANEL_SPECS', value: comprehensiveSpecs.PANEL, required: 1348 },
      { name: 'G3_BATTERY_SPECS', value: comprehensiveSpecs.BATTERY_MODULE, required: 513 },
      { name: 'G3_INVERTER_SPECS', value: comprehensiveSpecs.INVERTER, required: 2411 }
    ];
    
    for (const gate of gateUpdates) {
      const { error } = await supabase
        .from('readiness_gates')
        .upsert({
          gate_name: gate.name,
          required_value: gate.required,
          current_value: gate.value,
          passing: gate.value >= gate.required,
          last_checked: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (error) {
        console.error(`❌ Failed to update gate ${gate.name}:`, error);
      } else {
        console.log(`🎯 Updated gate ${gate.name}: ${gate.value}/${gate.required}`);
      }
    }
    
    // Update job status based on completion
    const allCompleted = Object.values(comprehensiveSpecs).every((count, index) => {
      const targets = [1348, 513, 2411]; // PANEL, BATTERY_MODULE, INVERTER
      return count >= targets[index];
    });
    
    await supabase
      .from('scrape_jobs')
      .update({
        status: allCompleted ? 'completed' : 'running',
        finished_at: allCompleted ? new Date().toISOString() : null
      })
      .eq('id', latestJobId);
    
    console.log(`📊 Job status: ${allCompleted ? 'COMPLETED' : 'RUNNING'}`);
    console.log(`📊 Final counts - Panels: ${comprehensiveSpecs.PANEL}/1348, Batteries: ${comprehensiveSpecs.BATTERY_MODULE}/513, Inverters: ${comprehensiveSpecs.INVERTER}/2411`);
    console.log('🎉 Force sync completed successfully!');
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Job progress force synced and cleaned up',
        counts: comprehensiveSpecs,
        jobId: latestJobId,
        allCompleted
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('❌ Force sync error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});