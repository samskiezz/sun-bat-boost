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
  // CORRECTED: Proper annual cost calculation
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
    // FIXED: Proper fallback calculation using baseline usage data
    // Estimate annual usage from baseline cost and current plan's estimated rate
    const baselineSupply = supply; // Use same supply charge
    const estimatedUsage = Math.max(0, ctx.baseline_cost_aud - baselineSupply); // Usage portion
    
    // Convert usage cost back to kWh using estimated rate, then apply this plan's rates
    const estimatedRate = 30; // cents per kWh - conservative average
    const annualUsageKWh = (estimatedUsage * 100) / estimatedRate; // Convert to kWh
    
    // Apply this plan's rate structure to the estimated usage
    if (plan.meter_type === 'TOU' && plan.usage_c_per_kwh_shoulder && plan.usage_c_per_kwh_offpeak) {
      // TOU distribution: 30% peak, 40% shoulder, 30% off-peak
      usage = (annualUsageKWh * 0.30 * plan.usage_c_per_kwh_peak / 100) +
              (annualUsageKWh * 0.40 * plan.usage_c_per_kwh_shoulder / 100) +
              (annualUsageKWh * 0.30 * plan.usage_c_per_kwh_offpeak / 100);
    } else {
      // Single rate
      usage = annualUsageKWh * plan.usage_c_per_kwh_peak / 100;
    }
  }
  
  const totalCost = supply + usage - exportRev;
  console.log(`Plan cost breakdown - ${plan.retailer} ${plan.plan_name}: Supply: $${supply.toFixed(2)}, Usage: $${usage.toFixed(2)}, Export: -$${exportRev.toFixed(2)}, Total: $${totalCost.toFixed(2)}`);
  
  return totalCost;
}

export function rankPlans(plans: RetailPlan[], ctx: RankContext, trainingConfidence?: number) {
  const baseConfidence = trainingConfidence || 0.85;
  const scored = plans.map(p => ({ 
    plan: p, 
    annual_cost_aud: calcAnnualCost(p, ctx), 
    delta_vs_baseline_aud: 0, 
    confidence: baseConfidence 
  }));
  
  scored.forEach(s => 
    s.delta_vs_baseline_aud = s.annual_cost_aud - ctx.baseline_cost_aud
  );
  
  scored.sort((a, b) => a.annual_cost_aud - b.annual_cost_aud);
  
  return scored.slice(0, 3);
}