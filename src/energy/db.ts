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

export async function fetchPlans(state: string, network: string, meter: "Single"|"TOU"|"Demand"): Promise<RetailPlan[]> { 
  try {
    // Try to fetch from database first
    const { data: dbPlans } = await supabase
      .from("energy_plans")
      .select("*")
      .eq("state", state)
      .eq("network", network)
      .eq("meter_type", meter)
      .limit(10);
    
    if (dbPlans && dbPlans.length > 0) {
      // Convert database plans to RetailPlan format
      return dbPlans.map(plan => ({
        id: plan.id,
        retailer: plan.retailer,
        plan_name: plan.plan_name,
        state: plan.state,
        network: plan.network,
        meter_type: plan.meter_type as "Single"|"TOU"|"Demand",
        supply_c_per_day: plan.supply_c_per_day,
        usage_c_per_kwh_peak: plan.usage_c_per_kwh_peak,
        usage_c_per_kwh_shoulder: plan.usage_c_per_kwh_shoulder,
        usage_c_per_kwh_offpeak: plan.usage_c_per_kwh_offpeak,
        fit_c_per_kwh: plan.fit_c_per_kwh,
        demand_c_per_kw: plan.demand_c_per_kw,
        controlled_c_per_kwh: plan.controlled_c_per_kwh,
        tou_windows: plan.tou_windows as any,
        effective_from: plan.effective_from
      }));
    }
  } catch (error) {
    console.warn("Failed to fetch plans from database, using demo data:", error);
  }
  
  // Fallback to demo plans
  return DEMO_PLANS.filter(p => 
    p.state === state && 
    p.network === network && 
    p.meter_type === meter
  ); 
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