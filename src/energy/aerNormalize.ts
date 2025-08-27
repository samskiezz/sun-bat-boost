// AER PRD to RetailPlan Normalizer
// Converts CDR EnergyPlan schema to our internal RetailPlan format

import type { RetailPlan, TouWindow } from "@/ai/orchestrator/contracts";

export function planToRetailPlan(aerPlan: any): RetailPlan | null {
  if (!aerPlan?.fuelType || aerPlan.fuelType !== "ELECTRICITY") {
    return null;
  }

  // Handle different response structures from AER
  const planDetail = aerPlan?.planDetail || aerPlan;
  const electricityContract = planDetail?.electricityContract || 
                             planDetail?.plan?.electricityContract ||
                             aerPlan?.electricityContract;

  if (!electricityContract) {
    console.warn("No electricity contract found in plan:", aerPlan?.planId);
    return null;
  }

  // Extract basic plan info
  const planId = aerPlan?.planId || aerPlan?.id || generatePlanId();
  const retailer = aerPlan?._retailer_display_name || 
                  planDetail?.brand || 
                  aerPlan?.brand || 
                  "Unknown Retailer";
  
  const planName = planDetail?.displayName || 
                   planDetail?.planName || 
                   aerPlan?.displayName || 
                   "Unnamed Plan";

  // Extract supply charge (daily supply charge in cents)
  const dailySupply = extractDailySupplyCharge(electricityContract);
  if (!dailySupply || dailySupply <= 0) {
    console.warn("Invalid or missing daily supply charge for plan:", planId);
    return null;
  }

  // Extract usage rates and tariff structure
  const tariffStructure = analyzeTariffStructure(electricityContract);
  if (!tariffStructure.peak_rate || tariffStructure.peak_rate <= 0) {
    console.warn("Invalid or missing peak usage rate for plan:", planId);
    return null;
  }

  // Extract feed-in tariff
  const feedInTariff = extractFeedInTariff(electricityContract);

  // Extract optional charges
  const demandCharge = extractDemandCharge(electricityContract);
  const controlledLoadRate = extractControlledLoadRate(electricityContract);

  // Determine geography
  const geography = planDetail?.geography || aerPlan?.geography || ["NSW"];
  const primaryState = Array.isArray(geography) ? geography[0] : geography;

  // Build the normalized retail plan
  const retailPlan: RetailPlan = {
    id: planId,
    retailer: retailer,
    plan_name: planName,
    state: primaryState || "NSW",
    network: "Unknown", // AER doesn't provide DNSP info directly
    meter_type: tariffStructure.meter_type,
    supply_c_per_day: dailySupply,
    usage_c_per_kwh_peak: tariffStructure.peak_rate,
    usage_c_per_kwh_shoulder: tariffStructure.shoulder_rate,
    usage_c_per_kwh_offpeak: tariffStructure.offpeak_rate,
    fit_c_per_kwh: feedInTariff,
    demand_c_per_kw: demandCharge,
    controlled_c_per_kwh: controlledLoadRate,
    tou_windows: tariffStructure.tou_windows,
    effective_from: new Date().toISOString(),
    effective_to: null,
    source: "AER_PRD",
    hash: generatePlanHash(planId, dailySupply, tariffStructure.peak_rate),
    last_refreshed: new Date().toISOString()
  };

  return retailPlan;
}

function extractDailySupplyCharge(contract: any): number {
  // Look for daily supply charges in various structures
  const supplyCharges = contract?.dailySupplyCharges || 
                       contract?.supplyCharges || 
                       contract?.supply ||
                       [];

  if (Array.isArray(supplyCharges) && supplyCharges.length > 0) {
    const charge = supplyCharges[0];
    return parseFloat(charge?.amount || charge?.rate || 0);
  }

  // Fallback: look for single supply charge value
  const singleSupply = contract?.dailySupplyCharge || contract?.supplyCharge;
  if (singleSupply) {
    return parseFloat(singleSupply?.amount || singleSupply || 0);
  }

  return 0;
}

function analyzeTariffStructure(contract: any) {
  const tariffPeriods = contract?.tariffPeriod || 
                       contract?.tariffPeriods || 
                       contract?.timeOfUseRates ||
                       contract?.rates || 
                       [];

  let peak_rate = 0;
  let shoulder_rate: number | null = null;
  let offpeak_rate: number | null = null;
  const tou_windows: TouWindow[] = [];
  let meter_type: "Single" | "TOU" | "Demand" = "Single";

  if (!Array.isArray(tariffPeriods) || tariffPeriods.length === 0) {
    // Single rate structure
    const singleRate = contract?.singleRate || contract?.rate;
    peak_rate = parseFloat(singleRate?.amount || singleRate || 0);
    meter_type = "Single";
  } else {
    // Time-based tariff structure
    const rateMap = new Map<string, number>();

    tariffPeriods.forEach((period: any) => {
      const displayName = (period?.displayName || period?.name || period?.type || "").toLowerCase();
      const rateAmount = parseFloat(period?.amount || period?.rate || period?.unitPrice || 0);

      if (rateAmount <= 0) return;

      // Categorize rate type
      let rateType = "peak"; // default
      if (displayName.includes("off") && displayName.includes("peak")) {
        rateType = "offpeak";
      } else if (displayName.includes("shoulder")) {
        rateType = "shoulder";
      } else if (displayName.includes("peak")) {
        rateType = "peak";
      } else if (displayName.includes("demand")) {
        meter_type = "Demand";
        return; // Handle demand charges separately
      }

      // Store the rate (use first occurrence for each type)
      if (!rateMap.has(rateType)) {
        rateMap.set(rateType, rateAmount);
      }

      // Extract time windows for TOU
      const timeWindow = extractTimeWindow(period, rateType);
      if (timeWindow) {
        tou_windows.push(timeWindow);
      }
    });

    // Assign rates
    peak_rate = rateMap.get("peak") || rateMap.get("single") || 0;
    shoulder_rate = rateMap.get("shoulder") || null;
    offpeak_rate = rateMap.get("offpeak") || null;

    // Determine meter type
    if (meter_type === "Single" && (shoulder_rate !== null || offpeak_rate !== null)) {
      meter_type = "TOU";
    }
  }

  return {
    peak_rate,
    shoulder_rate,
    offpeak_rate,
    tou_windows,
    meter_type
  };
}

function extractTimeWindow(period: any, rateType: string): TouWindow | null {
  const startTime = period?.startTime || "00:00";
  const endTime = period?.endTime || "24:00";
  
  // Default to weekdays for peak/shoulder, all days for off-peak
  let days = [1, 2, 3, 4, 5, 6, 0]; // All days
  
  if (period?.days) {
    const dayMap: { [key: string]: number } = {
      'MON': 1, 'TUE': 2, 'WED': 3, 'THU': 4, 'FRI': 5, 'SAT': 6, 'SUN': 0
    };
    
    days = period.days.map((d: string) => dayMap[d.toUpperCase()] ?? 0).filter((d: number) => d !== undefined);
  } else if (rateType === "peak" || rateType === "shoulder") {
    days = [1, 2, 3, 4, 5]; // Weekdays only
  }

  return {
    label: rateType as "peak" | "shoulder" | "offpeak",
    days,
    start: startTime.slice(0, 5), // Ensure HH:MM format
    end: endTime.slice(0, 5)
  };
}

function extractFeedInTariff(contract: any): number {
  const fit = contract?.solarFeedInTariff || 
             contract?.feedInTariff ||
             contract?.fit;

  if (Array.isArray(fit) && fit.length > 0) {
    return parseFloat(fit[0]?.amount || fit[0]?.rate || 0);
  }

  return parseFloat(fit?.amount || fit?.rate || fit || 0);
}

function extractDemandCharge(contract: any): number | null {
  const demandCharges = contract?.demandCharges || [];
  if (Array.isArray(demandCharges) && demandCharges.length > 0) {
    const charge = demandCharges[0];
    const amount = parseFloat(charge?.amount || charge?.rate || 0);
    return amount > 0 ? amount : null;
  }
  return null;
}

function extractControlledLoadRate(contract: any): number | null {
  const controlledLoad = contract?.controlledLoad || [];
  if (Array.isArray(controlledLoad) && controlledLoad.length > 0) {
    const load = controlledLoad[0];
    const rate = parseFloat(load?.rate?.amount || load?.amount || 0);
    return rate > 0 ? rate : null;
  }
  return null;
}

function generatePlanId(): string {
  return `aer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function generatePlanHash(planId: string, supply: number, peak: number): string {
  const content = `${planId}-${supply}-${peak}-${Date.now()}`;
  // Simple hash for now - could use crypto.subtle.digest in production
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}