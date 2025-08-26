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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get product counts by category
    const { data: productCounts, error: countsError } = await supabaseClient.rpc('get_product_counts_by_category');
    
    if (countsError && countsError.code !== 'PGRST116') { // Ignore "function not found" error
      console.error('Error getting product counts:', countsError);
    }

    // Fallback: manual count if RPC function doesn't exist
    let counts = productCounts;
    if (!counts || counts.length === 0) {
      const categories = ['PANEL', 'INVERTER', 'BATTERY_MODULE', 'BATTERY_STACK'];
      counts = [];
      
      for (const category of categories) {
        const { count } = await supabaseClient
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('category', category);
          
        const { count: withSpecs } = await supabaseClient
          .from('products')
          .select('id', { count: 'exact', head: true })
          .eq('category', category)
          .not('specs', 'is', null);
          
        counts.push({
          category,
          count: count || 0,
          with_specs: withSpecs || 0
        });
      }
    }

    return new Response(
      JSON.stringify(counts), // Return the array directly
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});