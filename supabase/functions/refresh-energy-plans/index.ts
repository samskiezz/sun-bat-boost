import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type TouWindow = { label:"peak"|"shoulder"|"offpeak"; days:number[]; start:string; end:string };

function now(){ return new Date().toISOString(); }

function normalizeOffer(o:any){
  return {
    retailer: o.retailer, plan_name: o.plan_name, state: o.state, network: o.network, meter_type: o.meter_type,
    supply_c_per_day: o.supply_c_per_day, usage_c_per_kwh_peak: o.usage_c_per_kwh_peak,
    usage_c_per_kwh_shoulder: o.usage_c_per_kwh_shoulder ?? null, usage_c_per_kwh_offpeak: o.usage_c_per_kwh_offpeak ?? null,
    fit_c_per_kwh: o.fit_c_per_kwh, demand_c_per_kw: o.demand_c_per_kw ?? null, controlled_c_per_kwh: o.controlled_c_per_kwh ?? null,
    tou_windows: o.tou_windows as TouWindow[]
  };
}

async function fetchEMEOffers(state:string){
  const demo = [{
    retailer:"Demo Energy", plan_name:"Simple Saver", state, network:"Ausgrid", meter_type:"TOU",
    supply_c_per_day:110, usage_c_per_kwh_peak:40, usage_c_per_kwh_shoulder:28, usage_c_per_kwh_offpeak:18,
    fit_c_per_kwh:7, demand_c_per_kw:null, controlled_c_per_kwh:18,
    tou_windows:[
      {label:"peak", days:[1,2,3,4,5], start:"14:00", end:"20:00"},
      {label:"shoulder", days:[1,2,3,4,5], start:"07:00", end:"14:00"},
      {label:"shoulder", days:[1,2,3,4,5], start:"20:00", end:"22:00"},
      {label:"offpeak", days:[1,2,3,4,5], start:"22:00", end:"07:00"},
      {label:"offpeak", days:[0,6], start:"00:00", end:"24:00"}
    ]
  }];
  return demo.map(normalizeOffer);
}

async function sha(hexStr:string){ return hexStr; }

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const states = ["NSW","VIC","QLD","SA","TAS","ACT"];
  let inserted = 0, total = 0;
  
  for (const st of states){
    const offers = await fetchEMEOffers(st);
    total += offers.length;
    for (const off of offers){
      const hashHex = await sha(JSON.stringify(off));
      const { data: exists } = await supabase.from("energy_plans").select("id,hash").eq("hash", hashHex).maybeSingle();
      if (!exists){
        await supabase.from("energy_plans").insert([{...off, hash: hashHex, effective_from: now(), source:"EME_API", last_refreshed: now()}]);
        inserted++;
      } else {
        await supabase.from("energy_plans").update({ last_refreshed: now() }).eq("id", exists.id);
      }
    }
  }
  
  return new Response(JSON.stringify({ ok:true, inserted, total }), { 
    headers: { ...corsHeaders, "content-type":"application/json" }
  });
});