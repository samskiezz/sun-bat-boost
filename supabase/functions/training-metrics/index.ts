import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'get_metrics';
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const since = url.searchParams.get('since');

    let query = supabaseClient
      .from('training_metrics')
      .select('*');

    switch (action) {
      case 'get_metrics':
        query = query.order('created_at', { ascending: false }).limit(limit);
        if (since) {
          query = query.gte('created_at', since);
        }
        break;
      
      case 'get_latest':
        query = query.order('created_at', { ascending: false }).limit(10);
        break;
      
      case 'get_by_type':
        const metricType = url.searchParams.get('metric_type');
        if (metricType) {
          query = query.eq('metric_type', metricType).order('created_at', { ascending: false }).limit(limit);
        }
        break;
      
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    const { data, error } = await query;

    if (error) {
      console.error('Training metrics error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Log access for security monitoring
    await supabaseClient.from('training_access_logs').insert({
      table_accessed: 'training_metrics',
      action: action,
      user_agent: req.headers.get('user-agent'),
      security_context: { 
        endpoint: 'training-metrics',
        records_returned: data?.length || 0 
      }
    });

    return new Response(JSON.stringify({ data, success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Training metrics function error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});