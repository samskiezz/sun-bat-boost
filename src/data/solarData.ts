// Australian Solar Rebate Calculator Data Configuration

export interface SolarZoneData {
  zone: number;
  multiplier: number;
}

export interface BatteryRebateRule {
  type: "flat" | "per_kwh";
  amount: number;
  min_kwh?: number;
  max_kwh_cap?: number;
  program_name: string;
  effective_from: string;
  expires_on: string;
}

export interface VppIncentiveRule {
  provider: string;
  amount_aud: number;
  conditions: string;
  state_limits?: string[];
  effective_from: string;
  expires_on: string;
  battery_required: boolean;
  compatible_batteries: string[];
  min_battery_kwh: number;
}

// STC Zone multipliers (annual kWh/kW)
export const ZONE_MULTIPLIERS: Record<number, number> = {
  1: 1.622,
  2: 1.536,
  3: 1.382,
  4: 1.185,
};

// Postcode to Zone mapping (sample data - in production this would be comprehensive)
export const POSTCODE_ZONES: Record<string, number> = {
  // NSW samples
  "2000": 3, "2001": 3, "2010": 3, "2020": 3, "2030": 3,
  "2040": 3, "2050": 3, "2060": 3, "2070": 3, "2080": 3,
  "2090": 3, "2100": 3, "2110": 3, "2120": 3, "2130": 3,
  
  // VIC samples
  "3000": 4, "3001": 4, "3002": 4, "3003": 4, "3004": 4,
  "3005": 4, "3006": 4, "3008": 4, "3010": 4, "3011": 4,
  
  // QLD samples
  "4000": 2, "4001": 2, "4005": 2, "4006": 2, "4007": 2,
  "4008": 2, "4009": 2, "4010": 2, "4011": 2, "4012": 2,
  
  // SA samples
  "5000": 3, "5001": 3, "5005": 3, "5006": 3, "5007": 3,
  
  // WA samples
  "6000": 2, "6001": 2, "6003": 2, "6004": 2, "6005": 2,
  
  // ACT samples
  "2600": 3, "2601": 3, "2602": 3, "2603": 3, "2604": 3,
  
  // TAS samples
  "7000": 4, "7001": 4, "7004": 4, "7005": 4, "7007": 4,
  
  // NT samples
  "0800": 1, "0801": 1, "0802": 1, "0803": 1, "0804": 1,
};

// State default zones
export const STATE_DEFAULT_ZONES: Record<string, number> = {
  NSW: 3,
  VIC: 4,
  QLD: 2,
  SA: 3,
  WA: 2,
  ACT: 3,
  TAS: 4,
  NT: 1,
};

// Battery rebate rules by state - Updated for 2025 (most state programs have ended)
export const BATTERY_REBATES: Record<string, BatteryRebateRule> = {
  // NSW: PDRS battery discount ended June 30, 2025 - no longer available
  // VIC: State rebate program ended December 31, 2024 - now uses federal program only  
  // QLD: Battery Booster program closed May 8, 2024 - now uses federal program only
  // SA: Home Battery Scheme ended December 31, 2024 - no current state rebate
  // Most states now rely on the federal STC program starting July 1, 2025
};

// VPP incentives with battery compatibility requirements
export const VPP_INCENTIVES: Record<string, VppIncentiveRule> = {
  tesla: {
    provider: "Tesla Energy Plan",
    amount_aud: 400,
    conditions: "Must join Tesla VPP with Powerwall",
    state_limits: ["NSW", "VIC", "SA"],
    effective_from: "2024-01-01",
    expires_on: "2024-12-31",
    battery_required: true,
    compatible_batteries: ["tesla-powerwall-2", "tesla-powerwall-3"],
    min_battery_kwh: 13.5,
  },
  origin: {
    provider: "Origin Loop",
    amount_aud: 200,
    conditions: "Must join Origin VPP program",
    state_limits: ["NSW", "VIC", "QLD", "SA"],
    effective_from: "2024-01-01",
    expires_on: "2024-12-31",
    battery_required: true,
    compatible_batteries: ["tesla-powerwall-2", "sonnen-eco-10", "lg-resu-10h", "byd-hvm-11"],
    min_battery_kwh: 6.0,
  },
  agl: {
    provider: "AGL VPP",
    amount_aud: 250,
    conditions: "Must join AGL Virtual Power Plant",
    state_limits: ["NSW", "VIC", "SA"],
    effective_from: "2024-01-01",
    expires_on: "2024-12-31",
    battery_required: true,
    compatible_batteries: ["tesla-powerwall-2", "sonnen-eco-10", "lg-resu-10h", "byd-hvm-11", "redback-smart-hybrid-10"],
    min_battery_kwh: 6.0,
  },
  energyaustralia: {
    provider: "EnergyAustralia VPP",
    amount_aud: 300,
    conditions: "Must join EnergyAustralia Virtual Power Plant",
    state_limits: ["NSW", "VIC", "QLD", "SA"],
    effective_from: "2024-01-01",
    expires_on: "2024-12-31",
    battery_required: true,
    compatible_batteries: ["tesla-powerwall-2", "tesla-powerwall-3", "sonnen-evo", "lg-resu-10h", "redback-smart-hybrid-10"],
    min_battery_kwh: 9.0,
  },
  redback: {
    provider: "Redback Technologies VPP",
    amount_aud: 500,
    conditions: "Must install Redback system and join VPP",
    state_limits: ["NSW", "VIC", "QLD", "SA", "WA"],
    effective_from: "2024-01-01",
    expires_on: "2024-12-31",
    battery_required: true,
    compatible_batteries: ["redback-smart-hybrid-10", "redback-smart-hybrid-13"],
    min_battery_kwh: 10.0,
  },
  sonnen: {
    provider: "sonnenFlat",
    amount_aud: 600,
    conditions: "Must install sonnen battery and join VPP",
    state_limits: ["NSW", "VIC", "SA"],
    effective_from: "2024-01-01",
    expires_on: "2024-12-31",
    battery_required: true,
    compatible_batteries: ["sonnen-eco-10", "sonnen-evo"],
    min_battery_kwh: 10.0,
  },
  amber: {
    provider: "Amber Electric VPP",
    amount_aud: 150,
    conditions: "Must join Amber wholesale pricing plan",
    state_limits: ["NSW", "VIC", "QLD", "SA"],
    effective_from: "2024-01-01",
    expires_on: "2024-12-31",
    battery_required: false,
    compatible_batteries: [], // Compatible with most batteries
    min_battery_kwh: 0,
  },
  powershop: {
    provider: "Powershop VPP",
    amount_aud: 200,
    conditions: "Must join Powershop VPP program",
    state_limits: ["NSW", "VIC", "SA"],
    effective_from: "2024-01-01",
    expires_on: "2024-12-31",
    battery_required: true,
    compatible_batteries: ["tesla-powerwall-2", "lg-resu-10h", "byd-hvm-11"],
    min_battery_kwh: 6.0,
  },
  diamond: {
    provider: "Diamond Energy VPP",
    amount_aud: 250,
    conditions: "Must join Diamond Energy Virtual Power Plant",
    state_limits: ["NSW", "VIC", "QLD", "SA"],
    effective_from: "2024-01-01",
    expires_on: "2024-12-31",
    battery_required: true,
    compatible_batteries: ["tesla-powerwall-2", "lg-resu-10h", "byd-hvm-11"],
    min_battery_kwh: 6.0,
  },
  simply: {
    provider: "Simply Energy VPP",
    amount_aud: 180,
    conditions: "Must join Simply Energy VPP program",
    state_limits: ["NSW", "VIC", "SA"],
    effective_from: "2024-01-01",
    expires_on: "2024-12-31",
    battery_required: true,
    compatible_batteries: ["tesla-powerwall-2", "lg-resu-10h", "byd-hvm-11"],
    min_battery_kwh: 6.0,
  },
  alinta: {
    provider: "Alinta Energy VPP",
    amount_aud: 220,
    conditions: "Must join Alinta VPP program",
    state_limits: ["NSW", "VIC", "QLD", "SA", "WA"],
    effective_from: "2024-01-01",
    expires_on: "2024-12-31",
    battery_required: true,
    compatible_batteries: ["tesla-powerwall-2", "lg-resu-10h", "byd-hvm-11"],
    min_battery_kwh: 6.0,
  },
  shellcove: {
    provider: "ShellCove Energy VPP",
    amount_aud: 350,
    conditions: "Must join ShellCove VPP program",
    state_limits: ["NSW", "VIC", "QLD"],
    effective_from: "2024-01-01",
    expires_on: "2024-12-31",
    battery_required: true,
    compatible_batteries: ["tesla-powerwall-2", "lg-resu-10h", "byd-hvm-11"],
    min_battery_kwh: 6.0,
  },
  // New VPP providers
  reposit: {
    provider: "Reposit Power",
    amount_aud: 400,
    conditions: "Must install Reposit GridCredits controller",
    state_limits: ["NSW", "VIC", "QLD", "SA"],
    effective_from: "2024-01-01",
    expires_on: "2024-12-31",
    battery_required: true,
    compatible_batteries: ["tesla-powerwall-2", "lg-resu-10h", "byd-hvm-11", "pylontech-us5000"],
    min_battery_kwh: 5.0,
  },
  arena: {
    provider: "Arena Energy VPP",
    amount_aud: 280,
    conditions: "Must join Arena VPP program",
    state_limits: ["NSW", "VIC", "SA"],
    effective_from: "2024-01-01",
    expires_on: "2024-12-31",
    battery_required: true,
    compatible_batteries: ["tesla-powerwall-2", "lg-resu-10h", "byd-hvm-11"],
    min_battery_kwh: 6.0,
  },
  mojo: {
    provider: "Mojo Power VPP",
    amount_aud: 320,
    conditions: "Must join Mojo Power VPP",
    state_limits: ["NSW", "VIC", "QLD"],
    effective_from: "2024-01-01",
    expires_on: "2024-12-31",
    battery_required: true,
    compatible_batteries: ["tesla-powerwall-2", "lg-resu-10h", "enphase-iq-battery-5p"],
    min_battery_kwh: 5.0,
  },
  powerclub: {
    provider: "Power Club VPP",
    amount_aud: 190,
    conditions: "Must join Power Club VPP program",
    state_limits: ["NSW", "VIC"],
    effective_from: "2024-01-01",
    expires_on: "2024-12-31",
    battery_required: true,
    compatible_batteries: ["tesla-powerwall-2", "lg-resu-10h", "byd-hvm-11"],
    min_battery_kwh: 6.0,
  },
  yurika: {
    provider: "Yurika Energy VPP",
    amount_aud: 240,
    conditions: "Must join Yurika VPP program",
    state_limits: ["NSW", "VIC", "QLD", "SA"],
    effective_from: "2024-01-01",
    expires_on: "2024-12-31",
    battery_required: true,
    compatible_batteries: ["tesla-powerwall-2", "lg-resu-10h", "byd-hvm-11"],
    min_battery_kwh: 6.0,
  },
  nectr: {
    provider: "Nectr VPP",
    amount_aud: 210,
    conditions: "Must join Nectr VPP program",
    state_limits: ["NSW", "VIC", "QLD", "SA"],
    effective_from: "2024-01-01",
    expires_on: "2024-12-31",
    battery_required: true,
    compatible_batteries: ["tesla-powerwall-2", "lg-resu-10h", "byd-hvm-11"],
    min_battery_kwh: 6.0,
  },
  ovo: {
    provider: "OVO Energy VPP",
    amount_aud: 290,
    conditions: "Must join OVO Energy VPP program",
    state_limits: ["NSW", "VIC", "SA"],
    effective_from: "2024-01-01",
    expires_on: "2024-12-31",
    battery_required: true,
    compatible_batteries: ["tesla-powerwall-2", "lg-resu-10h", "byd-hvm-11"],
    min_battery_kwh: 6.0,
  },
  kogan: {
    provider: "Kogan Energy VPP",
    amount_aud: 160,
    conditions: "Must join Kogan Energy VPP program",
    state_limits: ["NSW", "VIC", "QLD", "SA"],
    effective_from: "2024-01-01",
    expires_on: "2024-12-31",
    battery_required: true,
    compatible_batteries: ["tesla-powerwall-2", "lg-resu-10h", "byd-hvm-11"],
    min_battery_kwh: 6.0,
  },
  "first-energy": {
    provider: "1st Energy VPP",
    amount_aud: 230,
    conditions: "Must join 1st Energy VPP program",
    state_limits: ["NSW", "VIC", "QLD"],
    effective_from: "2024-01-01",
    expires_on: "2024-12-31",
    battery_required: true,
    compatible_batteries: ["tesla-powerwall-2", "lg-resu-10h", "byd-hvm-11"],
    min_battery_kwh: 6.0,
  },
};

// Helper function to get state from postcode
export function getStateFromPostcode(postcode: string): string {
  const code = parseInt(postcode);
  
  if (code >= 2000 && code <= 2999) return "NSW";
  if (code >= 3000 && code <= 3999) return "VIC";
  if (code >= 4000 && code <= 4999) return "QLD";
  if (code >= 5000 && code <= 5999) return "SA";
  if (code >= 6000 && code <= 6999) return "WA";
  if (code >= 7000 && code <= 7999) return "TAS";
  if (code >= 800 && code <= 899) return "NT";
  if (code >= 2600 && code <= 2699) return "ACT";
  
  return "NSW"; // Default fallback
}