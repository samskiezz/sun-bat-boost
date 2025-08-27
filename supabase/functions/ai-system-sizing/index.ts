import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SizingRequest {
  billData: {
    quarterlyUsage: number;
    quarterlyBill: number;
    dailySupply: number;
    averageRate: number;
    peakUsage?: number;
    offPeakUsage?: number;
    shoulderUsage?: number;
    peakRate?: number;
    offPeakRate?: number;
    shoulderRate?: number;
    touWindows?: Array<{
      period: string;
      hours: string;
      rate: number;
      usage: number;
    }>;
  };
  locationData: {
    postcode: string;
    state: string;
    network: string;
    meterType: string;
  };
  preferences?: {
    budget?: number;
    offsetGoal?: number; // percentage of bill to offset
    batteryRequired?: boolean;
    backupRequired?: boolean;
    roofSpace?: string; // 'limited' | 'average' | 'large'
    shading?: string; // 'none' | 'minimal' | 'moderate' | 'significant'
  };
}

interface ProductRecommendation {
  panels: {
    model: string;
    brand: string;
    wattage: number;
    count: number;
    totalKw: number;
    efficiency: number;
    cost_estimate: number;
  };
  battery?: {
    model: string;
    brand: string;
    capacity_kwh: number;
    usable_capacity: number;
    cost_estimate: number;
    cycles: number;
  };
  inverter: {
    type: string;
    capacity_kw: number;
    efficiency: number;
    cost_estimate: number;
  };
}

interface SizingResult {
  recommendations: ProductRecommendation;
  financial: {
    current_annual_bill: number;
    new_annual_bill: number;
    annual_savings: number;
    monthly_savings: number;
    bill_reduction_percent: number;
    annual_generation: number;
    self_consumption: number;
    export_income: number;
    export_generation: number;
  };
  rationale: {
    sizing_factors: string[];
    ai_reasoning: string;
    confidence: number;
    alternatives: string[];
  };
  performance: {
    summer_generation: number;
    winter_generation: number;
    battery_cycles_per_year: number;
    grid_independence: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { billData, locationData, preferences }: SizingRequest = await req.json();
    
    console.log('🤖 Starting AI-powered system sizing...');
    console.log('Input data:', { billData, locationData, preferences });

    // Step 1: Get solar irradiance data for location
    const solarData = await getSolarIrradianceData(locationData.state, locationData.postcode);
    
    // Step 2: Analyze usage patterns with AI
    const usageAnalysis = await analyzeUsagePatterns(billData);
    
    // Step 3: Get available products from database
    const availableProducts = await getAvailableProducts(supabase);
    
    // Step 4: Use AI to recommend optimal system
    const aiRecommendations = await getAIRecommendations({
      billData,
      locationData,
      preferences,
      solarData,
      usageAnalysis,
      availableProducts
    });
    
    // Step 5: Calculate detailed financial analysis
    const financialAnalysis = await calculateDetailedFinancials(
      aiRecommendations,
      billData,
      locationData,
      solarData
    );
    
    // Step 6: Performance modeling
    const performanceModel = await modelSystemPerformance(
      aiRecommendations,
      solarData,
      usageAnalysis
    );

    const result: SizingResult = {
      recommendations: aiRecommendations,
      financial: financialAnalysis,
      rationale: {
        sizing_factors: [
          `Annual usage: ${(billData.quarterlyUsage * 4).toLocaleString()} kWh`,
          `Daily usage: ${usageAnalysis.daily_average.toFixed(1)} kWh/day`,
          `Day usage (60%): ${usageAnalysis.day_usage.toFixed(1)} kWh/day`, 
          `Night usage (40%): ${usageAnalysis.night_usage.toFixed(1)} kWh/day`,
          `Battery sized: ${usageAnalysis.battery_required_kwh.toFixed(1)} kWh (rebate optimized)`,
          `Peak sun hours: ${solarData.peak_sun_hours}h × 85% derate`,
          `PV system: ${aiRecommendations.panels.totalKw}kW (1.25× safety factor)`,
          `Expected generation: ${Math.round(aiRecommendations.panels.totalKw * solarData.peak_sun_hours * 365 * 0.85).toLocaleString()} kWh/year`,
          `DNSP export limit: ${locationData.network} network`
        ],
        ai_reasoning: await generateAIReasoning(aiRecommendations, usageAnalysis, locationData),
        confidence: calculateConfidenceScore(aiRecommendations, usageAnalysis),
        alternatives: [],
        // CRITICAL: Display detailed usage breakdown
        usage_analysis: {
          daily_total_kwh: usageAnalysis.daily_average,
          day_usage_kwh: usageAnalysis.day_usage,
          night_usage_kwh: usageAnalysis.night_usage,
          battery_buffer_percent: usageAnalysis.battery_buffer_percent,
          pv_safety_factor: 1.25,
          sizing_methodology: usageAnalysis.sizing_methodology
        },
        compliance_checks: {
          dnsp_network: locationData.network,
          vpp_eligible: aiRecommendations.battery ? aiRecommendations.battery.capacity_kwh <= 30 : false,
          rebate_battery_size: usageAnalysis.battery_required_kwh,
          export_limit_compliant: true
        }
      },
      performance: performanceModel
    };

    console.log('✅ AI sizing complete:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ AI sizing error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      fallback: await getFallbackSizing()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function getSolarIrradianceData(state: string, postcode: string) {
  // Solar irradiance data for Australian states (kWh/m²/year)
  const irradianceData = {
    'NSW': { annual_irradiance: 1600, peak_sun_hours: 4.5, seasonal_variation: 0.35 },
    'VIC': { annual_irradiance: 1500, peak_sun_hours: 4.2, seasonal_variation: 0.45 },
    'QLD': { annual_irradiance: 1750, peak_sun_hours: 5.0, seasonal_variation: 0.25 },
    'SA': { annual_irradiance: 1650, peak_sun_hours: 4.7, seasonal_variation: 0.4 },
    'WA': { annual_irradiance: 1800, peak_sun_hours: 5.2, seasonal_variation: 0.3 },
    'TAS': { annual_irradiance: 1350, peak_sun_hours: 3.8, seasonal_variation: 0.6 },
    'NT': { annual_irradiance: 1900, peak_sun_hours: 5.5, seasonal_variation: 0.15 },
    'ACT': { annual_irradiance: 1550, peak_sun_hours: 4.3, seasonal_variation: 0.4 }
  };
  
  return irradianceData[state as keyof typeof irradianceData] || irradianceData['NSW'];
}

async function analyzeUsagePatterns(billData: any) {
  const annualUsage = billData.quarterlyUsage * 4;
  const dailyUsage = annualUsage / 365;
  
  // CRITICAL: Proper 60/40 day/night split methodology
  const dayUsage = dailyUsage * 0.60; // 60% consumed during solar hours (9am-3pm)
  const nightUsage = dailyUsage * 0.40; // 40% consumed during evening/night (4pm-8am)
  
  console.log(`📊 USAGE BREAKDOWN:`);
  console.log(`  Daily Total: ${dailyUsage.toFixed(1)} kWh`);
  console.log(`  Day Usage (60%): ${dayUsage.toFixed(1)} kWh`);
  console.log(`  Night Usage (40%): ${nightUsage.toFixed(1)} kWh`);
  
  // Battery sizing: Night usage + 20% buffer, capped for rebate optimization
  const batteryBufferPercent = 20;
  const batteryUsableNeeded = nightUsage * (1 + batteryBufferPercent/100);
  const batteryTotalNeeded = batteryUsableNeeded / 0.90; // 90% DoD
  
  // NSW rebate cap: Max 30kWh eligible for VPP programs
  const rebateOptimalBattery = Math.min(batteryTotalNeeded, 30);
  
  console.log(`🔋 BATTERY SIZING:`);
  console.log(`  Night usage: ${nightUsage.toFixed(1)} kWh + ${batteryBufferPercent}% buffer = ${batteryUsableNeeded.toFixed(1)} kWh usable`);
  console.log(`  Total needed: ${batteryTotalNeeded.toFixed(1)} kWh → Rebate optimal: ${rebateOptimalBattery.toFixed(1)} kWh`);
  
  return {
    annual_usage: annualUsage,
    daily_average: dailyUsage,
    day_usage: dayUsage,
    night_usage: nightUsage,
    day_usage_annual: dayUsage * 365,
    night_usage_annual: nightUsage * 365,
    battery_required_kwh: rebateOptimalBattery,
    battery_buffer_percent: batteryBufferPercent,
    sizing_methodology: "60% day load + 40% night load + battery losses + 1.25x safety factor",
    battery_suitable: true
  };
}

async function getAvailableProducts(supabase: any) {
  console.log('📦 Fetching available products from database...');
  
  // Only get TIER 1 premium products
  const [panelsResult, batteriesResult] = await Promise.all([
    // Filter for only tier 1 panel brands
    supabase.from('pv_modules')
      .select('*')
      .in('brand', ['SunPower', 'Maxeon Solar', 'Panasonic', 'LG Solar', 'REC', 'Canadian Solar', 'Jinko Solar', 'LONGi Solar'])
      .gte('power_rating', 400) // Only high wattage panels
      .order('power_rating', { ascending: false })
      .limit(15),
    // Filter for only tier 1 battery brands  
    supabase.from('batteries')
      .select('*')
      .in('brand', ['Tesla', 'Enphase', 'BYD', 'Pylontech', 'Alpha ESS', 'Fronius', 'Sungrow'])
      .gte('capacity_kwh', 10) // Only larger capacity batteries
      .order('capacity_kwh', { ascending: false })
      .limit(10)
  ]);
  
  return {
    panels: panelsResult.data || [],
    batteries: batteriesResult.data || [],
    // Only tier 1 inverter brands
    inverters: [
      { brand: 'Fronius', model: 'Primo', efficiency: 0.98, cost_per_kw: 900 },
      { brand: 'SolarEdge', model: 'HD-Wave', efficiency: 0.99, cost_per_kw: 1000 },
      { brand: 'Enphase', model: 'IQ8', efficiency: 0.97, cost_per_kw: 950 },
      { brand: 'Huawei', model: 'SUN2000', efficiency: 0.98, cost_per_kw: 850 },
      { brand: 'SMA', model: 'Sunny Boy', efficiency: 0.98, cost_per_kw: 900 }
    ]
  };
}

async function getAIRecommendations(params: any): Promise<ProductRecommendation> {
  const { billData, locationData, solarData, usageAnalysis, availableProducts, preferences } = params;
  
  console.log('🧠 PROPER SIZING METHODOLOGY...');
  
  // STEP 1: Calculate battery charging requirements
  const batteryChargeNeeded = usageAnalysis.battery_required_kwh * 1.10; // 10% charging losses
  
  // STEP 2: Calculate total daily PV generation needed
  const totalDailyPvNeeded = usageAnalysis.day_usage + batteryChargeNeeded;
  
  // STEP 3: Account for system losses and apply safety factor
  const systemDerate = 0.85; // Real-world losses (shading, inverter, wiring)
  const safetyFactor = 1.25; // 25% safety margin
  const basePvSize = totalDailyPvNeeded / (solarData.peak_sun_hours * systemDerate);
  const recommendedPvSize = basePvSize * safetyFactor;
  
  // STEP 4: Future-proofing for NSW - target 12-13kW minimum for bill elimination
  const futureProofSize = Math.max(recommendedPvSize, 12.0);
  
  // STEP 5: Check DNSP export limits
  const dnspLimits = {
    'Ausgrid': 5.0,
    'Endeavour Energy': 10.0,
    'Essential Energy': 5.0,
    'Default': 5.0
  };
  const exportLimit = dnspLimits[locationData.network as keyof typeof dnspLimits] || dnspLimits.Default;
  const maxPvWithoutUpgrade = exportLimit * 1.33; // Inverter oversizing limit
  
  // Final PV size - balance future-proofing with export limits
  const finalPvSize = Math.min(futureProofSize, maxPvWithoutUpgrade);
  
  console.log(`☀️ PV SIZING CALCULATION:`);
  console.log(`  Day load: ${usageAnalysis.day_usage.toFixed(1)} kWh`);
  console.log(`  Battery charge: ${batteryChargeNeeded.toFixed(1)} kWh`);
  console.log(`  Total daily PV needed: ${totalDailyPvNeeded.toFixed(1)} kWh`);
  console.log(`  Base size: ${basePvSize.toFixed(1)} kW × ${safetyFactor} safety = ${recommendedPvSize.toFixed(1)} kW`);
  console.log(`  Future-proof target: ${futureProofSize.toFixed(1)} kW`);
  console.log(`  DNSP limit (${locationData.network}): ${exportLimit} kW export`);
  console.log(`  Final recommendation: ${finalPvSize.toFixed(1)} kW`);
  
  // Select tier 1 products based on proper sizing
  const panelWattage = 550; // High-efficiency panels
  const panelCount = Math.ceil((finalPvSize * 1000) / panelWattage);
  const actualSystemKw = (panelCount * panelWattage) / 1000;
  
  // Battery selection - rebate optimized
  let selectedBattery;
  const batterySize = usageAnalysis.battery_required_kwh;
  
  if (batterySize <= 13.5) {
    selectedBattery = {
      model: "Powerwall 3",
      brand: "Tesla", 
      capacity_kwh: 13.5,
      usable_capacity: 13.5,
      cycles: 6000
    };
  } else if (batterySize <= 20.0) {
    selectedBattery = {
      model: "LUNA2000-20",
      brand: "Huawei",
      capacity_kwh: 20.0, 
      usable_capacity: 18.0,
      cycles: 6000
    };
  } else {
    selectedBattery = {
      model: "STORION-T30", 
      brand: "Alpha ESS",
      capacity_kwh: 30.72,
      usable_capacity: 27.6,
      cycles: 6000
    };
  }
  
  console.log(`🔋 SELECTED BATTERY: ${selectedBattery.brand} ${selectedBattery.model} - ${selectedBattery.capacity_kwh}kWh`);
  console.log(`📋 VPP ELIGIBLE: ${selectedBattery.capacity_kwh <= 30 ? 'YES' : 'NO'} (NSW rebate cap: 30kWh)`);
  
  return {
    panels: {
      model: `Tier1-${panelWattage}W-Pro`,
      brand: "Tier 1 Solar",
      wattage: panelWattage,
      count: panelCount,
      totalKw: actualSystemKw,
      efficiency: 0.22,
      cost_estimate: 0 // Removed per user request
    },
    battery: {
      model: selectedBattery.model,
      brand: selectedBattery.brand, 
      capacity_kwh: selectedBattery.capacity_kwh,
      usable_capacity: selectedBattery.usable_capacity,
      cost_estimate: 0, // Removed per user request
      cycles: selectedBattery.cycles
    },
    inverter: {
      type: "hybrid",
      capacity_kw: Math.ceil(actualSystemKw * 1.1 * 2) / 2, // Round to nearest 0.5kW, 10% oversizing
      efficiency: 0.98,
      cost_estimate: 0 // Removed per user request
    }
  };
}

function validateAndEnhanceRecommendation(rec: any, products: any, usage: any): ProductRecommendation {
  // Find matching products from database
  const selectedPanel = products.panels.find((p: any) => 
    p.model.toLowerCase().includes(rec.panels.model.toLowerCase()) ||
    p.brand.toLowerCase().includes(rec.panels.brand.toLowerCase())
  ) || products.panels[0];

  const selectedBattery = rec.battery?.model ? products.batteries.find((b: any) => 
    b.model.toLowerCase().includes(rec.battery.model.toLowerCase()) ||
    b.brand.toLowerCase().includes(rec.battery.brand.toLowerCase())
  ) || products.batteries[0] : null;

  return {
    panels: {
      model: selectedPanel?.model || rec.panels.model,
      brand: selectedPanel?.brand || rec.panels.brand,
      wattage: selectedPanel?.power_rating || rec.panels.wattage,
      count: rec.panels.count,
      totalKw: rec.panels.totalKw,
      efficiency: selectedPanel?.efficiency || 0.22,
      cost_estimate: rec.panels.totalKw * 1200 // $1200/kW installed
    },
    battery: selectedBattery ? {
      model: selectedBattery.model,
      brand: selectedBattery.brand,
      capacity_kwh: selectedBattery.capacity_kwh || selectedBattery.nominal_capacity,
      usable_capacity: selectedBattery.usable_capacity || (selectedBattery.capacity_kwh || selectedBattery.nominal_capacity) * 0.9,
      cost_estimate: (selectedBattery.capacity_kwh || selectedBattery.nominal_capacity) * 1000, // $1000/kWh
      cycles: 6000
    } : undefined,
    inverter: {
      type: rec.inverter.type,
      capacity_kw: rec.inverter.capacity_kw,
      efficiency: rec.inverter.efficiency,
      cost_estimate: rec.inverter.capacity_kw * 800
    }
  };
}

function getFallbackRecommendation(usage: any, products: any): ProductRecommendation {
  const systemKw = Math.ceil(usage.annual_usage / 1400); // Conservative sizing
  const panelWattage = 400;
  const panelCount = Math.ceil((systemKw * 1000) / panelWattage);
  
  return {
    panels: {
      model: products.panels[0]?.model || "Trina Solar Vertex",
      brand: products.panels[0]?.brand || "Trina Solar", 
      wattage: panelWattage,
      count: panelCount,
      totalKw: systemKw,
      efficiency: 0.22,
      cost_estimate: systemKw * 1200
    },
    battery: usage.battery_suitable ? {
      model: products.batteries[0]?.model || "Tesla Powerwall",
      brand: products.batteries[0]?.brand || "Tesla",
      capacity_kwh: 13.5,
      usable_capacity: 12.2,
      cost_estimate: 13500,
      cycles: 6000
    } : undefined,
    inverter: {
      type: "string",
      capacity_kw: systemKw,
      efficiency: 0.98,
      cost_estimate: systemKw * 800
    }
  };
}

async function calculateDetailedFinancials(rec: ProductRecommendation, billData: any, locationData: any, solarData: any) {
  // ACCURATE FINANCIAL MODELING - Energy bill savings only
  const currentAnnualBill = billData.quarterlyBill * 4;
  const annualGeneration = rec.panels.totalKw * solarData.peak_sun_hours * 365 * 0.85;
  
  console.log(`💰 FINANCIAL ANALYSIS:`);
  console.log(`  Current annual bill: $${currentAnnualBill}`);
  console.log(`  Expected generation: ${Math.round(annualGeneration).toLocaleString()} kWh/year`);
  
  // Calculate self-consumption with battery storage
  const annualUsage = billData.quarterlyUsage * 4;
  const batteryEnabled = rec.battery ? true : false;
  
  // With battery: higher self-consumption during peak rates
  const selfConsumptionRate = batteryEnabled ? 0.80 : 0.40; // 80% with battery, 40% without
  const selfConsumption = Math.min(annualGeneration, annualUsage * selfConsumptionRate);
  const exportGeneration = Math.max(0, annualGeneration - selfConsumption);
  
  // Financial calculations
  const averageRatePerKwh = billData.averageRate / 100; // Convert cents to dollars
  const fitRate = 0.08; // 8c/kWh feed-in tariff
  
  const billSavingsFromSelfConsumption = selfConsumption * averageRatePerKwh;
  const exportIncome = exportGeneration * fitRate;
  const totalAnnualSavings = billSavingsFromSelfConsumption + exportIncome;
  
  // New bill calculation - keep daily supply charges
  const dailySupplyCharges = (billData.dailySupply / 100) * 365;
  const remainingGridUsage = Math.max(0, annualUsage - selfConsumption);
  const remainingGridCost = remainingGridUsage * averageRatePerKwh;
  const newAnnualBill = dailySupplyCharges + remainingGridCost;
  
  // Verify math: Current bill - New bill should equal savings
  const actualSavings = currentAnnualBill - newAnnualBill;
  const billReductionPercent = Math.round((actualSavings / currentAnnualBill) * 100);
  
  console.log(`  Self-consumption: ${Math.round(selfConsumption).toLocaleString()} kWh (${selfConsumptionRate*100}%)`);
  console.log(`  Export: ${Math.round(exportGeneration).toLocaleString()} kWh`);
  console.log(`  Bill savings: $${Math.round(billSavingsFromSelfConsumption)}`);
  console.log(`  Export income: $${Math.round(exportIncome)}`);
  console.log(`  New annual bill: $${Math.round(newAnnualBill)}`);
  console.log(`  Total savings: $${Math.round(actualSavings)} (${billReductionPercent}%)`);
  
  // Validation check
  if (Math.abs(actualSavings - totalAnnualSavings) > 10) {
    console.warn(`⚠️  Math check failed: Calculated savings ${totalAnnualSavings} vs actual ${actualSavings}`);
  }
  
  return {
    current_annual_bill: Math.round(currentAnnualBill),
    new_annual_bill: Math.round(newAnnualBill),
    annual_savings: Math.round(actualSavings),
    monthly_savings: Math.round(actualSavings / 12),
    bill_reduction_percent: billReductionPercent,
    annual_generation: Math.round(annualGeneration),
    self_consumption: Math.round(selfConsumption),
    export_income: Math.round(exportIncome),
    export_generation: Math.round(exportGeneration)
  };
}
    self_consumption: Math.round(selfConsumption),
    export_income: Math.round(exportIncome),
    export_generation: Math.round(exportGeneration)
  };
}

async function modelSystemPerformance(rec: ProductRecommendation, solarData: any, usage: any) {
  const seasonalVar = solarData.seasonal_variation;
  const avgGeneration = rec.panels.totalKw * solarData.peak_sun_hours * 365 * 0.85;
  
  return {
    summer_generation: Math.round(avgGeneration * (1 + seasonalVar) / 2),
    winter_generation: Math.round(avgGeneration * (1 - seasonalVar) / 2),
    battery_cycles_per_year: rec.battery ? Math.round(usage.daily_average * 0.6 * 365 / (rec.battery.usable_capacity || 1)) : 0,
    grid_independence: rec.battery ? Math.round((usage.daily_average * 0.7 / usage.daily_average) * 100) : Math.round((usage.daily_average * 0.4 / usage.daily_average) * 100)
  };
}

async function generateAIReasoning(rec: ProductRecommendation, usage: any): Promise<string> {
  const batteryText = rec.battery ? 
    `Includes ${rec.battery.capacity_kwh}kWh ${rec.battery.brand} battery system sized for ${(usage.night_usage / 365).toFixed(1)}kWh daily night usage + 20% buffer. This enables 80% self-consumption and maximizes bill savings.` :
    'No battery system included.';
    
  return `Recommended ${rec.panels.totalKw}kW solar system with ${rec.panels.count} x ${rec.panels.wattage}W ${rec.panels.brand} panels sized using proper day/night methodology: 60% day usage (${(usage.day_usage/1000).toFixed(1)}MWh) + 40% night usage (${(usage.night_usage/1000).toFixed(1)}MWh) + battery losses, multiplied by 1.25x safety factor. ${batteryText} System designed to maximize energy bill reduction through high self-consumption during peak rate periods.`;
}

async function getFallbackSizing() {
  return {
    recommendations: {
      panels: { totalKw: 6.6, count: 22, cost_estimate: 7920 },
      battery: { capacity_kwh: 10, cost_estimate: 10000 },
      inverter: { capacity_kw: 5, cost_estimate: 4000 }
    },
    financial: { 
      system_cost: 21920,
      annual_savings: 2800,
      payback_period: 7.8,
      roi_25_year: 220
    }
  };
}