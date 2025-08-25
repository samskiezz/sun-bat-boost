// Solar rebate calculation utilities

export interface CalculationInput {
  postcode: string;
  solarKw: number;
  batteryKwh?: number;
  installDate: string;
  stcPrice: number;
  vppProvider?: string;
  mode: "ocr" | "picker" | "quick";
}

export interface CalculationResult {
  stc: {
    count: number;
    value: number;
    zone: number;
    years: number;
  };
  battery: {
    total: number;
    programs: Array<{ name: string; value: number; description: string }>;
  };
  vpp: {
    signup: number;
    estAnnual: number;
  };
  totals: {
    today: number;
    breakdown: Array<{ category: string; amount: number }>;
  };
  assumptions: {
    stcPrice: number;
    zone: string;
    installDate: string;
  };
}

// Mock postcode to zone mapping (would be loaded from data)
const postcodeZones: Record<string, number> = {
  "1000": 1, "2000": 1, "2001": 1, "2010": 1, // Sydney
  "3000": 2, "3001": 2, "3010": 2, "3141": 2, // Melbourne
  "4000": 1, "4001": 1, "4010": 1, "4059": 1, // Brisbane
  "5000": 2, "5001": 2, "5010": 2, "5034": 2, // Adelaide
  "6000": 3, "6001": 3, "6010": 3, "6109": 3, // Perth
  "7000": 2, "7001": 2, "7010": 2, "7250": 2, // Hobart
};

// Zone multipliers for STC calculation
const zoneMultipliers: Record<number, number> = {
  1: 1.622, // Zone 1 (highest)
  2: 1.536,
  3: 1.382,
  4: 1.185  // Zone 4 (lowest)
};

// Battery rebate programs by postcode/state
const batteryPrograms = {
  nsw: [
    { name: "NSW Peak Demand Reduction Scheme", rate: 372, minKwh: 2, maxKwh: 28 },
    { name: "NSW Home Battery Guide Program", rate: 400, minKwh: 10, maxKwh: 20 }
  ],
  vic: [
    { name: "VIC Solar Battery Rebate", rate: 4174, minKwh: 8.8, maxKwh: 13.5 }
  ],
  sa: [
    { name: "SA Home Battery Scheme", rate: 600, minKwh: 1, maxKwh: 30 }
  ]
};

// VPP signup bonuses and annual estimates
const vppPrograms: Record<string, { signup: number; annual: number }> = {
  "AGL": { signup: 300, annual: 400 },
  "Origin": { signup: 250, annual: 350 },
  "EnergyAustralia": { signup: 200, annual: 300 },
  "Simply Energy": { signup: 400, annual: 450 },
  "None": { signup: 0, annual: 0 }
};

export function getPostcodeZone(postcode: string): number {
  // Default to zone 2 if not found
  return postcodeZones[postcode] || 2;
}

export function getStateFromPostcode(postcode: string): string {
  const firstDigit = parseInt(postcode[0]);
  switch (firstDigit) {
    case 1: case 2: return "nsw";
    case 3: case 8: return "vic"; 
    case 4: case 9: return "qld";
    case 5: return "sa";
    case 6: return "wa";
    case 7: return "tas";
    default: return "nsw";
  }
}

export function calculateDeemingYears(installDate: string): number {
  const install = new Date(installDate);
  const currentYear = install.getFullYear();
  const endYear = 2030; // STC scheme ends
  return Math.max(0, endYear - currentYear + 1);
}

export function calculateSTCs(solarKw: number, zone: number, deemingYears: number): number {
  const multiplier = zoneMultipliers[zone] || 1.536;
  return Math.floor(solarKw * multiplier * deemingYears);
}

export function calculateBatteryRebates(batteryKwh: number, state: string): Array<{ name: string; value: number; description: string }> {
  const programs = batteryPrograms[state as keyof typeof batteryPrograms] || [];
  
  return programs
    .filter(program => batteryKwh >= program.minKwh && batteryKwh <= program.maxKwh)
    .map(program => ({
      name: program.name,
      value: Math.min(program.rate * batteryKwh, program.rate * program.maxKwh),
      description: `$${program.rate}/kWh (${program.minKwh}-${program.maxKwh}kWh eligible)`
    }));
}

export function calculateRebates(input: CalculationInput): CalculationResult {
  const zone = getPostcodeZone(input.postcode);
  const state = getStateFromPostcode(input.postcode);
  const deemingYears = calculateDeemingYears(input.installDate);
  
  // STC calculation
  const stcCount = calculateSTCs(input.solarKw, zone, deemingYears);
  const stcValue = stcCount * input.stcPrice;
  
  // Battery rebates
  const batteryPrograms = input.batteryKwh 
    ? calculateBatteryRebates(input.batteryKwh, state)
    : [];
  const batteryTotal = batteryPrograms.reduce((sum, program) => sum + program.value, 0);
  
  // VPP rebates
  const vppInfo = vppPrograms[input.vppProvider || "None"];
  
  // Totals
  const today = stcValue + batteryTotal + vppInfo.signup;
  const breakdown = [
    { category: "STC Rebate", amount: stcValue },
    { category: "Battery Rebates", amount: batteryTotal },
    { category: "VPP Signup", amount: vppInfo.signup }
  ].filter(item => item.amount > 0);
  
  return {
    stc: {
      count: stcCount,
      value: stcValue,
      zone,
      years: deemingYears
    },
    battery: {
      total: batteryTotal,
      programs: batteryPrograms
    },
    vpp: {
      signup: vppInfo.signup,
      estAnnual: vppInfo.annual
    },
    totals: {
      today,
      breakdown
    },
    assumptions: {
      stcPrice: input.stcPrice,
      zone: `Zone ${zone}`,
      installDate: input.installDate
    }
  };
}