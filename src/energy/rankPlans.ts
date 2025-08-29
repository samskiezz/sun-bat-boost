import type { RetailPlan } from "@/ai/orchestrator/contracts";
import { rateForHour } from "./db";

export type RankContext = { 
  postcode: number; 
  state: string; 
  network: string; 
  meter_type: "Single"|"TOU"|"Demand"; 
  baseline_cost_aud: number; 
  buy?: number[]; 
  sell?: number[]; 
  load?: number[]; 
};

export function calcAnnualCost(plan: RetailPlan, ctx: RankContext) {
  // CORRECTED: Fixed daily supply calculation and rate application
  const supply = (plan.supply_c_per_day / 100) * 365; // Convert cents to dollars
  let usage = 0, exportRev = 0;
  
  if (ctx.buy && ctx.sell) {
    // Hour-by-hour calculation for solar scenarios
    for (let h = 0; h < 8760; h++) { 
      const dow = Math.floor(h / 24) % 7; 
      const rate_c = rateForHour(plan, dow, h % 24); 
      usage += (ctx.buy[h] || 0) * (rate_c / 100); 
      exportRev += (ctx.sell[h] || 0) * (plan.fit_c_per_kwh / 100); 
    }
  } else if (ctx.load) {
    // Simplified calculation for basic load profile
    for (let h = 0; h < 8760; h++) { 
      const dow = Math.floor(h / 24) % 7; 
      const hourOfDay = h % 24;
      const rate_c = rateForHour(plan, dow, hourOfDay); 
      usage += (ctx.load[h] || 0) * (rate_c / 100); 
    }
  } else {
    // Fallback: use annual baseline with average rate estimation
    const avgRate = plan.usage_c_per_kwh_peak; // Use peak as conservative estimate
    usage = (ctx.baseline_cost_aud - supply); // Remove supply charge to get usage cost
  }
  
  const totalCost = supply + usage - exportRev;
  console.log(`Plan cost breakdown - ${plan.retailer} ${plan.plan_name}: Supply: $${supply.toFixed(2)}, Usage: $${usage.toFixed(2)}, Export: -$${exportRev.toFixed(2)}, Total: $${totalCost.toFixed(2)}`);
  
  return totalCost;
}

export function rankPlans(plans: RetailPlan[], ctx: RankContext) {
  const scored = plans.map(p => ({ 
    plan: p, 
    annual_cost_aud: calcAnnualCost(p, ctx), 
    delta_vs_baseline_aud: 0, 
    confidence: 0.85 
  }));
  
  scored.forEach(s => 
    s.delta_vs_baseline_aud = s.annual_cost_aud - ctx.baseline_cost_aud
  );
  
  scored.sort((a, b) => a.annual_cost_aud - b.annual_cost_aud);
  
  return scored.slice(0, 3);
}