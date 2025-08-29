import type { RetailPlan } from "@/ai/orchestrator/contracts";
import { supabase } from "@/integrations/supabase/client";

const DEMO_PLANS: RetailPlan[] = [
  {
    id:"demo-1", 
    retailer:"Demo Energy", 
    plan_name:"Simple Saver", 
    state:"NSW", 
    network:"Ausgrid", 
    meter_type:"TOU",
    supply_c_per_day:110, 
    usage_c_per_kwh_peak:40, 
    usage_c_per_kwh_shoulder:28, 
    usage_c_per_kwh_offpeak:18, 
    fit_c_per_kwh:7,
    demand_c_per_kw:null, 
    controlled_c_per_kwh:18,
    tou_windows:[
      {label:"peak", days:[1,2,3,4,5], start:"14:00", end:"20:00"},
      {label:"shoulder", days:[1,2,3,4,5], start:"07:00", end:"14:00"},
      {label:"shoulder", days:[1,2,3,4,5], start:"20:00", end:"22:00"},
      {label:"offpeak", days:[1,2,3,4,5], start:"22:00", end:"07:00"},
      {label:"offpeak", days:[0,6], start:"00:00", end:"24:00"}
    ]
  },
  {
    id:"demo-2", 
    retailer:"Origin Energy", 
    plan_name:"Predictable Plan", 
    state:"NSW", 
    network:"Ausgrid", 
    meter_type:"TOU",
    supply_c_per_day:98.45, 
    usage_c_per_kwh_peak:42, 
    usage_c_per_kwh_shoulder:25, 
    usage_c_per_kwh_offpeak:15, 
    fit_c_per_kwh:5,
    demand_c_per_kw:null, 
    controlled_c_per_kwh:15,
    tou_windows:[
      {label:"peak", days:[1,2,3,4,5], start:"14:00", end:"20:00"},
      {label:"shoulder", days:[1,2,3,4,5], start:"07:00", end:"14:00"},
      {label:"shoulder", days:[1,2,3,4,5], start:"20:00", end:"22:00"},
      {label:"offpeak", days:[1,2,3,4,5], start:"22:00", end:"07:00"},
      {label:"offpeak", days:[0,6], start:"00:00", end:"24:00"}
    ]
  },
  {
    id:"demo-3", 
    retailer:"AGL Energy", 
    plan_name:"Essentials Plan", 
    state:"NSW", 
    network:"Ausgrid", 
    meter_type:"TOU",
    supply_c_per_day:87.12, 
    usage_c_per_kwh_peak:38, 
    usage_c_per_kwh_shoulder:26, 
    usage_c_per_kwh_offpeak:16, 
    fit_c_per_kwh:6.7,
    demand_c_per_kw:null, 
    controlled_c_per_kwh:16,
    tou_windows:[
      {label:"peak", days:[1,2,3,4,5], start:"14:00", end:"20:00"},
      {label:"shoulder", days:[1,2,3,4,5], start:"07:00", end:"14:00"},
      {label:"shoulder", days:[1,2,3,4,5], start:"20:00", end:"22:00"},
      {label:"offpeak", days:[1,2,3,4,5], start:"22:00", end:"07:00"},
      {label:"offpeak", days:[0,6], start:"00:00", end:"24:00"}
    ]
  }
];

export async function fetchPlans(
  state: string, 
  network: string, 
  meter: "Single"|"TOU"|"Demand",
  postcode?: string
): Promise<RetailPlan[]> {
  console.log(`🔍 Fetching energy plans for ${state}, ${network}, ${meter}${postcode ? `, postcode: ${postcode}` : ''}`);
  
  try {
    // Try database first for real plans
    const { data, error } = await supabase
      .from('energy_plans')
      .select('*')
      .eq('state', state)
      .eq('meter_type', meter)
      .order('last_refreshed', { ascending: false })
      .limit(50);

    if (!error && data && data.length > 0) {
      console.log(`✅ Found ${data.length} real plans in database`);
      
      // Convert database records back to RetailPlan format
      const plans: RetailPlan[] = data.map(row => ({
        id: row.id,
        retailer: row.retailer,
        plan_name: row.plan_name,
        state: row.state,
        network: row.network || "Unknown",
        meter_type: row.meter_type as "Single"|"TOU"|"Demand",
        supply_c_per_day: Number(row.supply_c_per_day),
        usage_c_per_kwh_peak: Number(row.usage_c_per_kwh_peak),
        usage_c_per_kwh_shoulder: row.usage_c_per_kwh_shoulder ? Number(row.usage_c_per_kwh_shoulder) : null,
        usage_c_per_kwh_offpeak: row.usage_c_per_kwh_offpeak ? Number(row.usage_c_per_kwh_offpeak) : null,
        fit_c_per_kwh: Number(row.fit_c_per_kwh || 0),
        demand_c_per_kw: row.demand_c_per_kw ? Number(row.demand_c_per_kw) : null,
        controlled_c_per_kwh: row.controlled_c_per_kwh ? Number(row.controlled_c_per_kwh) : null,
        tou_windows: Array.isArray(row.tou_windows) ? (row.tou_windows as any[]).filter(w => w && typeof w === 'object') : [
          {label:"peak", days:[1,2,3,4,5], start:"14:00", end:"20:00"},
          {label:"shoulder", days:[1,2,3,4,5], start:"07:00", end:"14:00"},
          {label:"shoulder", days:[1,2,3,4,5], start:"20:00", end:"22:00"},
          {label:"offpeak", days:[1,2,3,4,5], start:"22:00", end:"07:00"},
          {label:"offpeak", days:[0,6], start:"00:00", end:"24:00"}
        ],
        effective_from: row.effective_from,
        effective_to: null,
        source: "AER_PRD",
        last_refreshed: row.last_refreshed
      }));
      
      return plans;
    }
    
    console.warn('❌ No plans found in database, using demo plans for', state, meter);
  } catch (error) {
    console.error('❌ Database query failed:', error);
  }
  
  // Always return demo plans as fallback with correct filtering
  const demoPlans = DEMO_PLANS.filter(plan => 
    plan.state === state && 
    plan.meter_type === meter
  );
  
  console.log(`📋 Using ${demoPlans.length} demo plans for ${state} ${meter}`);
  return demoPlans;

}

export async function exportCSV(calcContextHash: string) { 
  const res = await fetch(`/functions/v1/plan-comparison?ctx=${encodeURIComponent(calcContextHash)}`); 
  return await res.text(); 
}

export function rateForHour(plan: RetailPlan, dow: number, hour: number) {
  const label = plan.tou_windows.find(w => 
    w.days.includes(dow) && 
    hour >= Number(w.start.split(":")[0]) && 
    hour < Number(w.end.split(":")[0])
  )?.label ?? "offpeak";
  
  const map: any = { 
    peak: plan.usage_c_per_kwh_peak, 
    shoulder: plan.usage_c_per_kwh_shoulder ?? plan.usage_c_per_kwh_peak, 
    offpeak: plan.usage_c_per_kwh_offpeak ?? plan.usage_c_per_kwh_shoulder ?? plan.usage_c_per_kwh_peak 
  };
  
  return map[label] ?? plan.usage_c_per_kwh_peak;
}