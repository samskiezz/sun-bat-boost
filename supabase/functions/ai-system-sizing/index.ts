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
          `Day usage (60%): ${usageAnalysis.day_usage.toLocaleString()} kWh`, 
          `Night usage (40%): ${usageAnalysis.night_usage.toLocaleString()} kWh`,
          `Battery requirement: ${usageAnalysis.battery_required_kwh.toFixed(1)} kWh`,
          `Peak sun hours: ${solarData.peak_sun_hours}`,
          `System size (1.25x factor): ${aiRecommendations.panels.totalKw}kW`,
          `Expected generation: ${Math.round(aiRecommendations.panels.totalKw * solarData.peak_sun_hours * 365 * 0.85).toLocaleString()} kWh/year`
        ],
        ai_reasoning: await generateAIReasoning(aiRecommendations, usageAnalysis),
        confidence: 0.92,
        alternatives: []
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
  const monthlyUsage = billData.quarterlyUsage / 3;
  const dailyAverage = annualUsage / 365;
  
  // PROPER DAY/NIGHT SPLIT - This is the key fix!
  const dayUsage = annualUsage * 0.6; // 60% during solar hours (9am-3pm)
  const nightUsage = annualUsage * 0.4; // 40% during evening/night (4pm-8am)
  
  // Calculate battery requirement based on night usage
  const batteryRequiredKwh = (nightUsage / 365) * 1.2; // 20% buffer for night usage
  
  let pattern_type = 'standard';
  let peak_demand = dailyAverage / 8;
  
  if (billData.peakUsage && billData.offPeakUsage) {
    const totalUsage = billData.peakUsage + billData.offPeakUsage + (billData.shoulderUsage || 0);
    const peakRatio = billData.peakUsage / totalUsage;
    
    if (peakRatio > 0.6) {
      pattern_type = 'high_daytime';
      peak_demand = dailyAverage / 6;
    } else if (peakRatio < 0.3) {
      pattern_type = 'evening_heavy';
      peak_demand = dailyAverage / 4;
    } else {
      pattern_type = 'balanced';
      peak_demand = dailyAverage / 8;
    }
  }
  
  return {
    annual_usage: annualUsage,
    monthly_usage: monthlyUsage,
    daily_average: dailyAverage,
    day_usage: dayUsage,
    night_usage: nightUsage,
    battery_required_kwh: batteryRequiredKwh,
    peak_demand,
    pattern_type,
    evening_usage_ratio: pattern_type === 'evening_heavy' ? 0.7 : 0.4,
    battery_suitable: true // Always consider battery now
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
  
  console.log('🧠 Getting AI recommendations...');
  
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  // Prepare context for AI with PROPER SIZING METHODOLOGY
  const aiPrompt = `
You are a premium solar and battery system sizing expert. Follow this EXACT methodology:

STEP 1: USAGE ANALYSIS
- Annual usage: ${usageAnalysis.annual_usage} kWh
- Day usage (60%): ${usageAnalysis.day_usage} kWh
- Night usage (40%): ${usageAnalysis.night_usage} kWh  
- Daily night usage: ${(usageAnalysis.night_usage / 365).toFixed(1)} kWh

STEP 2: BATTERY SIZING (MANDATORY)
- Battery size needed: ${usageAnalysis.battery_required_kwh.toFixed(1)} kWh (night usage + 20% buffer)
- Always recommend a battery unless customer explicitly refuses

STEP 3: PANEL SIZING WITH 1.25X SAFETY FACTOR
Calculate: (day usage + night usage + battery charging losses) × 1.25
Battery charging efficiency: 90% (10% losses)
Required system size: ${((usageAnalysis.day_usage + usageAnalysis.night_usage + (usageAnalysis.night_usage * 0.1)) * 1.25 / (solarData.peak_sun_hours * 365 * 0.85)).toFixed(1)} kW

LOCATION DATA:
- State: ${locationData.state}
- Peak sun hours: ${solarData.peak_sun_hours}
- Network: ${locationData.network}

FINANCIAL DATA:
- Quarterly bill: $${billData.quarterlyBill}
- Average rate: ${billData.averageRate}c/kWh

AVAILABLE TIER 1 PANELS (ONLY use these):
${availableProducts.panels.slice(0, 5).map(p => 
  `- ${p.brand} ${p.model}: ${p.power_rating}W`
).join('\n')}

AVAILABLE TIER 1 BATTERIES (ONLY use these):
${availableProducts.batteries.slice(0, 5).map(b => 
  `- ${b.brand} ${b.model}: ${b.capacity_kwh || b.nominal_capacity}kWh`
).join('\n')}

REQUIREMENTS:
1. ALWAYS recommend a battery sized for night usage + 20% buffer
2. Apply 1.25x safety factor to panel sizing
3. Only use TIER 1 brands from the available lists
4. Size system to cover day usage + night usage + battery losses

Respond in this exact JSON format:
{
  "panels": {
    "model": "exact model from available list",
    "brand": "exact brand from available list", 
    "wattage": number,
    "count": number,
    "totalKw": number (apply 1.25x factor),
    "efficiency": 0.22,
    "cost_estimate": 0
  },
  "battery": {
    "model": "exact model from available list",
    "brand": "exact brand from available list",
    "capacity_kwh": number (sized for night usage + 20%),
    "usable_capacity": number,
    "cost_estimate": 0,
    "cycles": 6000
  },
  "inverter": {
    "type": "hybrid",
    "capacity_kw": number (match panel size),
    "efficiency": 0.98,
    "cost_estimate": 0
  }
}
`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4.1-2025-04-14',
      messages: [
        { 
          role: 'system', 
          content: 'You are an expert solar and battery system designer with 15+ years experience in Australia. Provide accurate, financially optimal recommendations based on real-world performance data.'
        },
        { role: 'user', content: aiPrompt }
      ],
      temperature: 0.3,
      max_tokens: 1500
    }),
  });

  const aiResult = await response.json();
  console.log('🤖 AI Response:', aiResult);

  try {
    const recommendation = JSON.parse(aiResult.choices[0].message.content);
    
    // Validate and enhance recommendations
    return validateAndEnhanceRecommendation(recommendation, availableProducts, usageAnalysis);
    
  } catch (error) {
    console.error('Failed to parse AI recommendation, using fallback');
    return getFallbackRecommendation(usageAnalysis, availableProducts);
  }
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
  // DO NOT INCLUDE SYSTEM COSTS - ONLY ENERGY BILL SAVINGS!
  const annualGeneration = rec.panels.totalKw * solarData.peak_sun_hours * 365 * 0.85;
  const currentAnnualBill = billData.quarterlyBill * 4;
  
  // Calculate self-consumption with battery
  const selfConsumption = rec.battery ? 
    Math.min(annualGeneration, billData.quarterlyUsage * 4 * 0.8) : // 80% with battery
    Math.min(annualGeneration, billData.quarterlyUsage * 4 * 0.4);   // 40% without battery
  
  const exportGeneration = Math.max(0, annualGeneration - selfConsumption);
  const fitRate = 0.08; // 8c/kWh feed-in tariff
  const exportIncome = exportGeneration * fitRate;
  
  // Bill savings calculation
  const billSavings = selfConsumption * (billData.averageRate / 100);
  const totalAnnualSavings = billSavings + exportIncome;
  
  // New annual bill after solar
  const newAnnualBill = Math.max(0, currentAnnualBill - billSavings);
  const dailySupplyCharges = (billData.dailySupply / 100) * 365; // Still pay supply charges
  const finalNewBill = newAnnualBill + dailySupplyCharges;
  
  return {
    // Remove system_cost - not relevant for energy bill analysis
    current_annual_bill: Math.round(currentAnnualBill),
    new_annual_bill: Math.round(finalNewBill),
    annual_savings: Math.round(totalAnnualSavings),
    monthly_savings: Math.round(totalAnnualSavings / 12),
    bill_reduction_percent: Math.round((totalAnnualSavings / currentAnnualBill) * 100),
    annual_generation: Math.round(annualGeneration),
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