export type WithMeta<T> = T & { 
  confidence?: number; 
  provenance?: { model_id: string; version: string }; 
  lo?: number; 
  hi?: number; 
};

export type TouWindow = { 
  label: "peak"|"shoulder"|"offpeak"; 
  days: number[]; 
  start: string; 
  end: string; 
};

export type RetailPlan = { 
  id: string; 
  retailer: string; 
  plan_name: string; 
  state: string; 
  network: string; 
  meter_type: "Single"|"TOU"|"Demand"; 
  supply_c_per_day: number; 
  usage_c_per_kwh_peak: number; 
  usage_c_per_kwh_shoulder?: number|null; 
  usage_c_per_kwh_offpeak?: number|null; 
  fit_c_per_kwh: number; 
  demand_c_per_kw?: number|null; 
  controlled_c_per_kwh?: number|null; 
  tou_windows: TouWindow[]; 
  effective_from?: string;
  effective_to?: string|null;
  source?: string;
  hash?: string;
  last_refreshed?: string;
};

export type BillFields = { 
  retailer?: WithMeta<string>; 
  plan_name?: WithMeta<string>; 
  meter_type?: WithMeta<"Single"|"TOU"|"Demand">; 
  supply_c_per_day?: WithMeta<number>; 
  fit_c_per_kwh?: WithMeta<number>; 
};

export type LoadShape = { 
  hourly: number[]; 
  annual_kwh: number; 
};

export type DispatchResult = { 
  buy: number[]; 
  sell: number[]; 
  soc?: number[]; 
  cycles_year?: number; 
};

export type RoiResult = { 
  bill_before: number; 
  bill_after: number; 
  annual_savings: number; 
  payback_years: number; 
  npv: number; 
  irr: number; 
};

export type Topics =
 | { topic:"plans.lookup"; filters:{ postcode:number; meter_type:"Single"|"TOU"|"Demand" } }
 | { topic:"plan.candidates"; list: RetailPlan[] }
 | { topic:"plan.top3"; top: Array<{ plan: RetailPlan; annual_cost_aud: number; delta_vs_baseline_aud: number; confidence:number }>; baseline_cost:number }
 | { topic:"plan.selected"; plan: RetailPlan }
 | { topic:"accuracy.mode"; mode: "auto"|"preview"|"standard"|"exact" }
 | { topic:"bill.extracted"; bill: BillFields }
 | { topic:"load.estimated"; load: LoadShape }
 | { topic:"dispatch.sim"; dispatch: DispatchResult }
 | { topic:"roi.calculated"; roi: RoiResult }
 | { topic:"train.example"; payload: any }
 | { topic:"train.run"; target: string }
 | { topic:"model.updated"; model_id: string; version: string };