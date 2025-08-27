import type { RetailPlan } from "@/ai/orchestrator/contracts";

const DEMO_PLANS: RetailPlan[] = [{
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
}];

export async function fetchPlans(state: string, network: string, meter: "Single"|"TOU"|"Demand") { 
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