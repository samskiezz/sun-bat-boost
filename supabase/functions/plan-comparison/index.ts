import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
  const url = new URL(req.url);
  const hash = url.searchParams.get("ctx")!;
  
  const { data } = await supabase.from("plan_scores").select(`
    annual_cost_aud, delta_vs_baseline_aud, fit_value,
    energy_plans!inner(id,retailer,plan_name,state,network,meter_type,supply_c_per_day,usage_c_per_kwh_peak,usage_c_per_kwh_shoulder,usage_c_per_kwh_offpeak,fit_c_per_kwh)
  `).eq("calc_context_hash", hash).order("annual_cost_aud",{ascending:true}).limit(50);
  
  const rows = (data||[]).map((r:any) => [
    r.energy_plans.retailer, r.energy_plans.plan_name, r.energy_plans.state, r.energy_plans.network, r.energy_plans.meter_type,
    r.energy_plans.supply_c_per_day, r.energy_plans.usage_c_per_kwh_peak, r.energy_plans.usage_c_per_kwh_shoulder, r.energy_plans.usage_c_per_kwh_offpeak,
    r.energy_plans.fit_c_per_kwh, r.annual_cost_aud, r.delta_vs_baseline_aud, r.fit_value
  ]);
  
  const header = "Retailer,Plan,State,Network,Meter,Supply c/day,Peak c/kWh,Shoulder c/kWh,Off-peak c/kWh,FIT c/kWh,Est Annual $AUD,Delta $AUD,FIT c/kWh";
  const csv = [header, ...rows.map(r => r.join(","))].join("\n");
  
  return new Response(csv, { 
    headers: { ...corsHeaders, "content-type":"text/csv" }
  });
});