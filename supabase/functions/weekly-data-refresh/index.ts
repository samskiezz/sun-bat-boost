import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting weekly data refresh check...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if any data needs updating
    const { data: panelNeedsUpdate } = await supabase.rpc('check_data_freshness', {
      table_name_param: 'pv_modules'
    });

    const { data: batteryNeedsUpdate } = await supabase.rpc('check_data_freshness', {
      table_name_param: 'batteries'
    });

    const updates = [];

    // Update panels if needed
    if (panelNeedsUpdate) {
      console.log('Updating panel data...');
      const panelResult = await supabase.functions.invoke('cec-panel-scraper', {});
      updates.push({ type: 'panels', result: panelResult.data });
    } else {
      console.log('Panel data is current');
      updates.push({ type: 'panels', result: { skipped: true, message: 'Data is current' } });
    }

    // Update batteries if needed
    if (batteryNeedsUpdate) {
      console.log('Updating battery data...');
      const batteryResult = await supabase.functions.invoke('cec-battery-scraper', {});
      updates.push({ type: 'batteries', result: batteryResult.data });
    } else {
      console.log('Battery data is current');
      updates.push({ type: 'batteries', result: { skipped: true, message: 'Data is current' } });
    }

    // Get final counts
    const { data: panelTracking } = await supabase
      .from('data_update_tracking')
      .select('record_count, last_updated, status')
      .eq('table_name', 'pv_modules')
      .single();

    const { data: batteryTracking } = await supabase
      .from('data_update_tracking')
      .select('record_count, last_updated, status')
      .eq('table_name', 'batteries')
      .single();

    const result = {
      success: true,
      message: 'Weekly data refresh completed',
      updates,
      current_status: {
        panels: panelTracking,
        batteries: batteryTracking
      },
      total_records: (panelTracking?.record_count || 0) + (batteryTracking?.record_count || 0)
    };

    console.log('Weekly refresh result:', result);

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in weekly data refresh:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        message: 'Failed to complete weekly data refresh'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});