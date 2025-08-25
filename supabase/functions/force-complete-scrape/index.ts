import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting force complete scrape...');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Call both individual scrapers directly
    console.log('Calling panel scraper...');
    const panelResult = await supabase.functions.invoke('cec-panel-scraper', {});
    console.log('Panel scraper result:', panelResult);

    console.log('Calling battery scraper...');
    const batteryResult = await supabase.functions.invoke('cec-battery-scraper', {});
    console.log('Battery scraper result:', batteryResult);

    // Wait a moment for database to be updated
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Now fetch ALL data to verify
    console.log('Fetching all panels...');
    let allPanels: any[] = [];
    let offset = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: panelBatch, error: panelError } = await supabase
        .from('pv_modules')
        .select('*')
        .range(offset, offset + batchSize - 1)
        .order('brand', { ascending: true });

      if (panelError) {
        console.error('Error fetching panels:', panelError);
        throw panelError;
      }

      if (panelBatch && panelBatch.length > 0) {
        allPanels.push(...panelBatch);
        offset += batchSize;
        hasMore = panelBatch.length === batchSize;
        console.log(`Fetched ${allPanels.length} total panels...`);
      } else {
        hasMore = false;
      }
    }

    console.log('Fetching all batteries...');
    let allBatteries: any[] = [];
    offset = 0;
    hasMore = true;

    while (hasMore) {
      const { data: batteryBatch, error: batteryError } = await supabase
        .from('batteries')
        .select('*')
        .range(offset, offset + batchSize - 1)
        .order('brand', { ascending: true });

      if (batteryError) {
        console.error('Error fetching batteries:', batteryError);
        throw batteryError;
      }

      if (batteryBatch && batteryBatch.length > 0) {
        allBatteries.push(...batteryBatch);
        offset += batchSize;
        hasMore = batteryBatch.length === batchSize;
        console.log(`Fetched ${allBatteries.length} total batteries...`);
      } else {
        hasMore = false;
      }
    }

    // Check for Trina panels specifically
    const trinaPanels = allPanels.filter(p => 
      p.brand && p.brand.toLowerCase().includes('trina')
    );
    console.log(`Found ${trinaPanels.length} Trina panels:`, trinaPanels.slice(0, 3));

    const result = {
      success: true,
      panels: {
        total: allPanels.length,
        scraper_result: panelResult.data,
        trina_count: trinaPanels.length,
        sample_brands: [...new Set(allPanels.map(p => p.brand))].slice(0, 10)
      },
      batteries: {
        total: allBatteries.length,
        scraper_result: batteryResult.data,
        sample_brands: [...new Set(allBatteries.map(b => b.brand))].slice(0, 10)
      },
      complete: allPanels.length >= 1300 && allBatteries.length >= 800
    };

    console.log('Force scrape complete:', result);

    return new Response(
      JSON.stringify(result),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error in force complete scrape:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});