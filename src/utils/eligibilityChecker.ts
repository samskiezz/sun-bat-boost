export interface CalculationInput {
  postcode: string;
  solarKw: number;
  batteryKwh?: number;
  installDate: string;
  stcPrice: number;
  vppProvider?: string;
  mode?: string;
}

export interface EligibilityResult {
  status: "green" | "yellow" | "red";
  reasons: string[];
  suggestions: string[];
}

// System size recommendations with proper rebate limits
const sizeRecommendations = {
  optimal: { min: 6.6, max: 13.2 },
  battery: { 
    min: 10, 
    max: 28, // Rebate eligibility limit
    absoluteMax: 48 // System maximum before no additional rebates
  }
};

export function checkEligibility(input: CalculationInput, hasApprovedProducts: boolean = true): EligibilityResult {
  const reasons: string[] = [];
  const suggestions: string[] = [];
  let status: "green" | "yellow" | "red" = "green";

  // Check CEC approval (mock - would check against real data)
  if (!hasApprovedProducts) {
    reasons.push("Products not CEC-approved");
    status = "red";
  } else {
    reasons.push("All products are CEC-approved ✓");
  }

  // Check solar system size
  if (input.solarKw < sizeRecommendations.optimal.min) {
    reasons.push(`Solar system (${input.solarKw}kW) is below optimal range`);
    suggestions.push(`Try ${sizeRecommendations.optimal.min}kW system`);
    if (status === "green") status = "yellow";
  } else if (input.solarKw > sizeRecommendations.optimal.max * 1.5) {
    reasons.push(`Large system (${input.solarKw}kW) may have grid export limits`);
    suggestions.push("Check grid connection capacity");
    if (status === "green") status = "yellow";
  } else if (input.solarKw >= sizeRecommendations.optimal.min && input.solarKw <= sizeRecommendations.optimal.max) {
    reasons.push(`Solar size (${input.solarKw}kW) is in optimal range ✓`);
  }

  // Check battery size if present
  if (input.batteryKwh) {
    if (input.batteryKwh < sizeRecommendations.battery.min) {
      reasons.push(`Small battery (${input.batteryKwh}kWh) limits rebate programs`);
      suggestions.push("Consider 13.5kWh+ battery");
      if (status === "green") status = "yellow";
    } else if (input.batteryKwh > sizeRecommendations.battery.absoluteMax) {
      reasons.push(`Battery (${input.batteryKwh}kWh) exceeds 48kWh rebate cap - no additional rebates`);
      suggestions.push("Consider 48kWh max for rebates");
      status = "red";
    } else if (input.batteryKwh > sizeRecommendations.battery.max) {
      reasons.push(`Battery (${input.batteryKwh}kWh) exceeds 28kWh eligibility limit - reduced rebates`);
      suggestions.push("28kWh is rebate eligibility limit");
      if (status === "green") status = "yellow";
    } else {
      reasons.push(`Battery size (${input.batteryKwh}kWh) eligible for full rebates ✓`);
    }
  }

  // Check install date (STC deeming period)
  const installDate = new Date(input.installDate);
  const currentYear = installDate.getFullYear();
  if (currentYear >= 2029) {
    reasons.push("Install date near STC scheme end (2030)");
    suggestions.push("Install sooner for higher STCs");
    if (status === "green") status = "yellow";
  } else {
    reasons.push("Install date allows good STC deeming period ✓");
  }

  // Check postcode validity
  if (!input.postcode || input.postcode.length !== 4) {
    reasons.push("Invalid postcode provided");
    status = "red";
  } else {
    reasons.push("Postcode valid for zone calculation ✓");
  }

  // Check STC price reasonableness
  if (input.stcPrice < 30 || input.stcPrice > 45) {
    reasons.push(`STC price ($${input.stcPrice}) seems unusual`);
    suggestions.push("Check current STC market rates");
    if (status === "green") status = "yellow";
  }

  // Additional suggestions based on system
  if (input.solarKw >= 6.6 && !input.batteryKwh) {
    suggestions.push("Consider adding battery for additional rebates");
  }

  if (!input.vppProvider || input.vppProvider === "None") {
    suggestions.push("VPP signup could add $200-400 bonus");
  }

  return {
    status,
    reasons,
    suggestions: suggestions.slice(0, 4) // Limit suggestions
  };
}