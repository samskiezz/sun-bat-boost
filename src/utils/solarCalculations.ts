import { 
  ZONE_MULTIPLIERS, 
  POSTCODE_ZONES, 
  STATE_DEFAULT_ZONES, 
  BATTERY_REBATES, 
  VPP_INCENTIVES,
  getStateFromPostcode 
} from '@/data/solarData';

export interface CalculatorInputs {
  install_date: string;
  postcode: string;
  pv_dc_size_kw: number;
  stc_price_aud: number;
  battery_capacity_kwh: number;
  vpp_provider: string | null;
}

export interface CalculatorResults {
  install_date: string;
  state: string;
  postcode: string;
  pv_dc_size_kw: number;
  battery_capacity_kwh: number;
  zone: number;
  deeming_years: number;
  stcs: number;
  stc_price_aud: number;
  stc_value_aud: number;
  battery_program: {
    name: string;
    type: string;
    calc_basis: string;
    battery_rebate_aud: number;
  };
  vpp: {
    provider: string;
    conditions: string;
    vpp_incentive_aud: number;
  };
  total_rebate_aud: number;
  warning?: string;
  error?: string;
}

function lookupZone(postcode: string, state: string): { zone: number; warning?: string } {
  const zone = POSTCODE_ZONES[postcode];
  if (zone) {
    return { zone };
  }
  
  // Fall back to state default
  const defaultZone = STATE_DEFAULT_ZONES[state] || 3;
  return { 
    zone: defaultZone, 
    warning: "Postcode not in zone map; used state default" 
  };
}

function calculateDeemingYears(installDate: string): number {
  const install = new Date(installDate);
  const endOfScheme = new Date('2030-12-31');
  
  if (install > endOfScheme) {
    return 0;
  }
  
  const installYear = install.getFullYear();
  const endYear = 2030;
  
  return Math.max(0, endYear - installYear + 1);
}

function calculateSTCs(
  pvSizeKw: number, 
  zone: number, 
  deemingYears: number, 
  stcPrice: number
): { stcs: number; stc_value_aud: number } {
  if (pvSizeKw <= 0) {
    return { stcs: 0, stc_value_aud: 0 };
  }
  
  const zoneMultiplier = ZONE_MULTIPLIERS[zone] || ZONE_MULTIPLIERS[3];
  const rawStcs = pvSizeKw * zoneMultiplier * deemingYears;
  const stcs = Math.floor(rawStcs); // Must round down to whole certificates
  const stc_value_aud = stcs * stcPrice;
  
  return { stcs, stc_value_aud };
}

function calculateBatteryRebate(
  batteryCapacityKwh: number, 
  state: string
): { name: string; type: string; calc_basis: string; battery_rebate_aud: number } {
  const rule = BATTERY_REBATES[state];
  
  if (!rule || batteryCapacityKwh <= 0) {
    return {
      name: "",
      type: "",
      calc_basis: "",
      battery_rebate_aud: 0
    };
  }
  
  let rebateAmount = 0;
  let calcBasis = "";
  
  if (rule.type === "flat") {
    rebateAmount = rule.amount;
    calcBasis = `Flat rate: $${rule.amount}`;
  } else if (rule.type === "per_kwh") {
    let eligibleKwh = batteryCapacityKwh;
    
    if (rule.min_kwh && batteryCapacityKwh < rule.min_kwh) {
      eligibleKwh = 0; // Below minimum threshold
    }
    
    if (rule.max_kwh_cap) {
      eligibleKwh = Math.min(eligibleKwh, rule.max_kwh_cap);
    }
    
    rebateAmount = eligibleKwh * rule.amount;
    calcBasis = `${eligibleKwh}kWh × $${rule.amount}/kWh`;
  }
  
  return {
    name: rule.program_name,
    type: rule.type,
    calc_basis: calcBasis,
    battery_rebate_aud: Math.round(rebateAmount)
  };
}

function calculateVppIncentive(
  vppProvider: string | null, 
  state: string
): { provider: string; conditions: string; vpp_incentive_aud: number } {
  if (!vppProvider) {
    return {
      provider: "",
      conditions: "",
      vpp_incentive_aud: 0
    };
  }
  
  const vpp = VPP_INCENTIVES[vppProvider.toLowerCase()];
  
  if (!vpp) {
    return {
      provider: vppProvider,
      conditions: "Provider not found",
      vpp_incentive_aud: 0
    };
  }
  
  // Check state eligibility
  if (vpp.state_limits && !vpp.state_limits.includes(state)) {
    return {
      provider: vpp.provider,
      conditions: `Not available in ${state}`,
      vpp_incentive_aud: 0
    };
  }
  
  return {
    provider: vpp.provider,
    conditions: vpp.conditions,
    vpp_incentive_aud: vpp.amount_aud
  };
}

export function calculateSolarRebates(inputs: CalculatorInputs): CalculatorResults {
  // Validation
  if (inputs.pv_dc_size_kw <= 0) {
    return {
      install_date: inputs.install_date,
      state: "",
      postcode: inputs.postcode,
      pv_dc_size_kw: inputs.pv_dc_size_kw,
      battery_capacity_kwh: inputs.battery_capacity_kwh,
      zone: 0,
      deeming_years: 0,
      stcs: 0,
      stc_price_aud: inputs.stc_price_aud,
      stc_value_aud: 0,
      battery_program: { name: "", type: "", calc_basis: "", battery_rebate_aud: 0 },
      vpp: { provider: "", conditions: "", vpp_incentive_aud: 0 },
      total_rebate_aud: 0,
      error: "Invalid PV size"
    };
  }
  
  const state = getStateFromPostcode(inputs.postcode);
  const { zone, warning } = lookupZone(inputs.postcode, state);
  const deemingYears = calculateDeemingYears(inputs.install_date);
  
  const stcResults = calculateSTCs(
    inputs.pv_dc_size_kw, 
    zone, 
    deemingYears, 
    inputs.stc_price_aud
  );
  
  const batteryResults = calculateBatteryRebate(inputs.battery_capacity_kwh, state);
  const vppResults = calculateVppIncentive(inputs.vpp_provider, state);
  
  const totalRebate = stcResults.stc_value_aud + 
                     batteryResults.battery_rebate_aud + 
                     vppResults.vpp_incentive_aud;
  
  const result: CalculatorResults = {
    install_date: inputs.install_date,
    state,
    postcode: inputs.postcode,
    pv_dc_size_kw: inputs.pv_dc_size_kw,
    battery_capacity_kwh: inputs.battery_capacity_kwh,
    zone,
    deeming_years: deemingYears,
    stcs: stcResults.stcs,
    stc_price_aud: inputs.stc_price_aud,
    stc_value_aud: Math.round(stcResults.stc_value_aud),
    battery_program: batteryResults,
    vpp: vppResults,
    total_rebate_aud: Math.round(totalRebate)
  };
  
  if (warning) {
    result.warning = warning;
  }
  
  return result;
}