// Battery Storage Database - Top Australian Market Batteries

export interface BatterySpec {
  id: string;
  brand: string;
  model: string;
  capacity_kwh: number;
  usable_capacity_kwh: number;
  max_continuous_power_kw: number;
  chemistry: "LiFePO4" | "NMC" | "LTO";
  warranty_years: number;
  cycles: number;
  efficiency_percent: number;
  price_estimate_aud: number;
  vpp_compatible: string[]; // VPP provider IDs
  tier: 1 | 2 | 3;
  common_names: string[]; // For OCR matching
  dimensions: {
    width_mm: number;
    height_mm: number;
    depth_mm: number;
    weight_kg: number;
  };
}

export const BATTERY_SYSTEMS: Record<string, BatterySpec> = {
  // Tesla Premium
  "tesla-powerwall-2": {
    id: "tesla-powerwall-2",
    brand: "Tesla",
    model: "Powerwall 2",
    capacity_kwh: 13.5,
    usable_capacity_kwh: 13.5,
    max_continuous_power_kw: 5.0,
    chemistry: "NMC",
    warranty_years: 10,
    cycles: 6000,
    efficiency_percent: 90,
    price_estimate_aud: 12500,
    vpp_compatible: ["tesla", "amber", "energyaustralia"],
    tier: 1,
    common_names: ["Tesla Powerwall 2", "PW2", "Powerwall2"],
    dimensions: { width_mm: 1150, height_mm: 755, depth_mm: 155, weight_kg: 114 }
  },
  "tesla-powerwall-3": {
    id: "tesla-powerwall-3",
    brand: "Tesla",
    model: "Powerwall 3",
    capacity_kwh: 13.5,
    usable_capacity_kwh: 13.5,
    max_continuous_power_kw: 11.04,
    chemistry: "LiFePO4",
    warranty_years: 10,
    cycles: 8000,
    efficiency_percent: 97,
    price_estimate_aud: 15500,
    vpp_compatible: ["tesla", "amber", "energyaustralia"],
    tier: 1,
    common_names: ["Tesla Powerwall 3", "PW3", "Powerwall3"],
    dimensions: { width_mm: 1099, height_mm: 609, depth_mm: 193, weight_kg: 130 }
  },

  // Sonnen Premium
  "sonnen-eco-10": {
    id: "sonnen-eco-10",
    brand: "sonnen",
    model: "Eco 10",
    capacity_kwh: 10.0,
    usable_capacity_kwh: 10.0,
    max_continuous_power_kw: 3.3,
    chemistry: "LiFePO4",
    warranty_years: 10,
    cycles: 10000,
    efficiency_percent: 95,
    price_estimate_aud: 16000,
    vpp_compatible: ["sonnen", "origin", "agl"],
    tier: 1,
    common_names: ["sonnen Eco 10", "sonnenEco10", "Eco10"],
    dimensions: { width_mm: 680, height_mm: 1200, depth_mm: 300, weight_kg: 145 }
  },
  "sonnen-evo": {
    id: "sonnen-evo",
    brand: "sonnen",
    model: "Evo",
    capacity_kwh: 10.0,
    usable_capacity_kwh: 10.0,
    max_continuous_power_kw: 3.3,
    chemistry: "LiFePO4",
    warranty_years: 15,
    cycles: 10000,
    efficiency_percent: 97,
    price_estimate_aud: 18000,
    vpp_compatible: ["sonnen", "origin", "agl", "energyaustralia"],
    tier: 1,
    common_names: ["sonnen Evo", "sonnenEvo", "Evo"],
    dimensions: { width_mm: 680, height_mm: 1200, depth_mm: 300, weight_kg: 140 }
  },

  // Redback Premium Australian
  "redback-smart-hybrid-10": {
    id: "redback-smart-hybrid-10",
    brand: "Redback",
    model: "Smart Hybrid 10kWh",
    capacity_kwh: 10.24,
    usable_capacity_kwh: 9.0,
    max_continuous_power_kw: 5.0,
    chemistry: "LiFePO4",
    warranty_years: 10,
    cycles: 6000,
    efficiency_percent: 95,
    price_estimate_aud: 11500,
    vpp_compatible: ["redback", "origin", "agl", "energyaustralia"],
    tier: 1,
    common_names: ["Redback Smart Hybrid", "RB-SH10", "Smart Hybrid"],
    dimensions: { width_mm: 600, height_mm: 1300, depth_mm: 250, weight_kg: 120 }
  },
  "redback-smart-hybrid-13": {
    id: "redback-smart-hybrid-13",
    brand: "Redback",
    model: "Smart Hybrid 13kWh",
    capacity_kwh: 13.3,
    usable_capacity_kwh: 12.0,
    max_continuous_power_kw: 5.0,
    chemistry: "LiFePO4",
    warranty_years: 10,
    cycles: 6000,
    efficiency_percent: 95,
    price_estimate_aud: 14500,
    vpp_compatible: ["redback", "origin", "agl", "energyaustralia"],
    tier: 1,
    common_names: ["Redback Smart Hybrid", "RB-SH13", "Smart Hybrid 13"],
    dimensions: { width_mm: 600, height_mm: 1600, depth_mm: 250, weight_kg: 150 }
  },

  // Enphase Modular
  "enphase-iq-battery-3": {
    id: "enphase-iq-battery-3",
    brand: "Enphase",
    model: "IQ Battery 3",
    capacity_kwh: 3.36,
    usable_capacity_kwh: 3.36,
    max_continuous_power_kw: 1.28,
    chemistry: "LiFePO4",
    warranty_years: 15,
    cycles: 6000,
    efficiency_percent: 89,
    price_estimate_aud: 4500,
    vpp_compatible: ["amber", "origin", "agl"],
    tier: 1,
    common_names: ["Enphase IQ Battery 3", "IQ3", "IQ Battery"],
    dimensions: { width_mm: 350, height_mm: 440, depth_mm: 185, weight_kg: 36 }
  },
  "enphase-iq-battery-5p": {
    id: "enphase-iq-battery-5p",
    brand: "Enphase",
    model: "IQ Battery 5P",
    capacity_kwh: 5.0,
    usable_capacity_kwh: 5.0,
    max_continuous_power_kw: 3.84,
    chemistry: "LiFePO4",
    warranty_years: 15,
    cycles: 6000,
    efficiency_percent: 89,
    price_estimate_aud: 7200,
    vpp_compatible: ["amber", "origin", "agl"],
    tier: 1,
    common_names: ["Enphase IQ Battery 5P", "IQ5P", "IQ Battery 5"],
    dimensions: { width_mm: 445, height_mm: 576, depth_mm: 185, weight_kg: 56 }
  },

  // LG Chem Premium
  "lg-resu-10h": {
    id: "lg-resu-10h",
    brand: "LG Energy Solution",
    model: "RESU 10H",
    capacity_kwh: 9.8,
    usable_capacity_kwh: 9.3,
    max_continuous_power_kw: 5.0,
    chemistry: "NMC",
    warranty_years: 10,
    cycles: 6000,
    efficiency_percent: 95,
    price_estimate_aud: 8500,
    vpp_compatible: ["amber", "origin", "agl", "energyaustralia"],
    tier: 1,
    common_names: ["LG RESU 10H", "LG10H", "RESU10H"],
    dimensions: { width_mm: 452, height_mm: 688, depth_mm: 220, weight_kg: 98 }
  },
  "lg-resu-16h": {
    id: "lg-resu-16h",
    brand: "LG Energy Solution",
    model: "RESU 16H",
    capacity_kwh: 16.0,
    usable_capacity_kwh: 14.4,
    max_continuous_power_kw: 7.0,
    chemistry: "NMC",
    warranty_years: 10,
    cycles: 6000,
    efficiency_percent: 95,
    price_estimate_aud: 12500,
    vpp_compatible: ["amber", "origin", "agl", "energyaustralia"],
    tier: 1,
    common_names: ["LG RESU 16H", "LG16H", "RESU16H"],
    dimensions: { width_mm: 452, height_mm: 1057, depth_mm: 220, weight_kg: 145 }
  },

  // BYD Popular
  "byd-hvm-11": {
    id: "byd-hvm-11",
    brand: "BYD",
    model: "HVM 11.04kWh",
    capacity_kwh: 11.04,
    usable_capacity_kwh: 8.8,
    max_continuous_power_kw: 2.56,
    chemistry: "LiFePO4",
    warranty_years: 10,
    cycles: 6000,
    efficiency_percent: 95,
    price_estimate_aud: 7500,
    vpp_compatible: ["amber", "origin", "agl"],
    tier: 2,
    common_names: ["BYD HVM", "BYD-HVM", "HVM11"],
    dimensions: { width_mm: 650, height_mm: 760, depth_mm: 180, weight_kg: 126 }
  },
  "byd-hvm-16": {
    id: "byd-hvm-16",
    brand: "BYD",
    model: "HVM 16.6kWh",
    capacity_kwh: 16.6,
    usable_capacity_kwh: 13.3,
    max_continuous_power_kw: 5.0,
    chemistry: "LiFePO4",
    warranty_years: 10,
    cycles: 6000,
    efficiency_percent: 95,
    price_estimate_aud: 11000,
    vpp_compatible: ["amber", "origin", "agl"],
    tier: 2,
    common_names: ["BYD HVM", "BYD-HVM", "HVM16"],
    dimensions: { width_mm: 650, height_mm: 1140, depth_mm: 180, weight_kg: 189 }
  },

  // Pylontech Value
  "pylontech-us3000c": {
    id: "pylontech-us3000c",
    brand: "Pylontech",
    model: "US3000C",
    capacity_kwh: 3.55,
    usable_capacity_kwh: 3.55,
    max_continuous_power_kw: 1.8,
    chemistry: "LiFePO4",
    warranty_years: 10,
    cycles: 6000,
    efficiency_percent: 95,
    price_estimate_aud: 2800,
    vpp_compatible: ["amber", "origin"],
    tier: 2,
    common_names: ["Pylontech US3000C", "US3000C", "PYL3000"],
    dimensions: { width_mm: 442, height_mm: 132, depth_mm: 420, weight_kg: 35 }
  },
  "pylontech-us5000": {
    id: "pylontech-us5000",
    brand: "Pylontech",
    model: "US5000",
    capacity_kwh: 4.8,
    usable_capacity_kwh: 4.8,
    max_continuous_power_kw: 2.4,
    chemistry: "LiFePO4",
    warranty_years: 10,
    cycles: 6000,
    efficiency_percent: 95,
    price_estimate_aud: 3500,
    vpp_compatible: ["amber", "origin"],
    tier: 2,
    common_names: ["Pylontech US5000", "US5000", "PYL5000"],
    dimensions: { width_mm: 442, height_mm: 132, depth_mm: 420, weight_kg: 37 }
  },

  // Goodwe/ALPHA-ESS Value Options
  "alpha-ess-smile-5": {
    id: "alpha-ess-smile-5",
    brand: "Alpha ESS",
    model: "SMILE 5",
    capacity_kwh: 5.2,
    usable_capacity_kwh: 4.6,
    max_continuous_power_kw: 2.6,
    chemistry: "LiFePO4",
    warranty_years: 10,
    cycles: 6000,
    efficiency_percent: 95,
    price_estimate_aud: 4200,
    vpp_compatible: ["amber", "origin"],
    tier: 2,
    common_names: ["Alpha ESS SMILE", "SMILE5", "ALP5"],
    dimensions: { width_mm: 570, height_mm: 375, depth_mm: 147, weight_kg: 52 }
  },
  "alpha-ess-smile-10": {
    id: "alpha-ess-smile-10",
    brand: "Alpha ESS",
    model: "SMILE 10",
    capacity_kwh: 10.1,
    usable_capacity_kwh: 9.1,
    max_continuous_power_kw: 5.0,
    chemistry: "LiFePO4",
    warranty_years: 10,
    cycles: 6000,
    efficiency_percent: 95,
    price_estimate_aud: 7800,
    vpp_compatible: ["amber", "origin"],
    tier: 2,
    common_names: ["Alpha ESS SMILE", "SMILE10", "ALP10"],
    dimensions: { width_mm: 570, height_mm: 750, depth_mm: 147, weight_kg: 104 }
  },

  // Sungrow Hybrid
  "sungrow-sbr-96": {
    id: "sungrow-sbr-96",
    brand: "Sungrow",
    model: "SBR 9.6kWh",
    capacity_kwh: 9.6,
    usable_capacity_kwh: 9.0,
    max_continuous_power_kw: 4.8,
    chemistry: "LiFePO4",
    warranty_years: 10,
    cycles: 6000,
    efficiency_percent: 95,
    price_estimate_aud: 6500,
    vpp_compatible: ["amber", "origin"],
    tier: 2,
    common_names: ["Sungrow SBR", "SBR96", "SUN96"],
    dimensions: { width_mm: 605, height_mm: 755, depth_mm: 155, weight_kg: 89 }
  },
  "sungrow-sbr-128": {
    id: "sungrow-sbr-128",
    brand: "Sungrow",
    model: "SBR 12.8kWh",
    capacity_kwh: 12.8,
    usable_capacity_kwh: 11.5,
    max_continuous_power_kw: 6.4,
    chemistry: "LiFePO4",
    warranty_years: 10,
    cycles: 6000,
    efficiency_percent: 95,
    price_estimate_aud: 8500,
    vpp_compatible: ["amber", "origin"],
    tier: 2,
    common_names: ["Sungrow SBR", "SBR128", "SUN128"],
    dimensions: { width_mm: 605, height_mm: 1005, depth_mm: 155, weight_kg: 119 }
  },

  // Budget Tier 3 Options
  "generic-lifepo4-10": {
    id: "generic-lifepo4-10",
    brand: "Generic",
    model: "LiFePO4 10kWh",
    capacity_kwh: 10.0,
    usable_capacity_kwh: 9.0,
    max_continuous_power_kw: 5.0,
    chemistry: "LiFePO4",
    warranty_years: 5,
    cycles: 4000,
    efficiency_percent: 90,
    price_estimate_aud: 5500,
    vpp_compatible: [],
    tier: 3,
    common_names: ["Generic LiFePO4", "Budget Battery", "LiFePO4"],
    dimensions: { width_mm: 600, height_mm: 800, depth_mm: 200, weight_kg: 100 }
  },
  "powerplus-energy-10": {
    id: "powerplus-energy-10",
    brand: "PowerPlus Energy",
    model: "LiFePO4 10kWh",
    capacity_kwh: 10.24,
    usable_capacity_kwh: 9.2,
    max_continuous_power_kw: 5.0,
    chemistry: "LiFePO4",
    warranty_years: 7,
    cycles: 5000,
    efficiency_percent: 92,
    price_estimate_aud: 6200,
    vpp_compatible: ["amber"],
    tier: 3,
    common_names: ["PowerPlus Energy", "PPE10", "PowerPlus"],
    dimensions: { width_mm: 550, height_mm: 850, depth_mm: 220, weight_kg: 95 }
  }
};

// Helper functions
export const getBatteriesByBrand = (brand: string): BatterySpec[] => {
  return Object.values(BATTERY_SYSTEMS).filter(battery => battery.brand === brand);
};

export const getBatteriesByTier = (tier: 1 | 2 | 3): BatterySpec[] => {
  return Object.values(BATTERY_SYSTEMS).filter(battery => battery.tier === tier);
};

export const getBatteriesByVPP = (vppId: string): BatterySpec[] => {
  return Object.values(BATTERY_SYSTEMS).filter(battery => 
    battery.vpp_compatible.includes(vppId)
  );
};

export const searchBatteries = (query: string): BatterySpec[] => {
  const searchTerm = query.toLowerCase();
  return Object.values(BATTERY_SYSTEMS).filter(battery => 
    battery.brand.toLowerCase().includes(searchTerm) ||
    battery.model.toLowerCase().includes(searchTerm) ||
    battery.common_names.some(name => name.toLowerCase().includes(searchTerm))
  );
};

export const BATTERY_BRANDS = Array.from(new Set(Object.values(BATTERY_SYSTEMS).map(b => b.brand))).sort();

// Calculate system capacity for multiple units
export const calculateSystemCapacity = (batteryId: string, quantity: number): {
  total_capacity_kwh: number;
  total_usable_kwh: number;
  total_power_kw: number;
  estimated_cost_aud: number;
} => {
  const battery = BATTERY_SYSTEMS[batteryId];
  if (!battery) {
    return { total_capacity_kwh: 0, total_usable_kwh: 0, total_power_kw: 0, estimated_cost_aud: 0 };
  }

  return {
    total_capacity_kwh: battery.capacity_kwh * quantity,
    total_usable_kwh: battery.usable_capacity_kwh * quantity,
    total_power_kw: battery.max_continuous_power_kw * quantity,
    estimated_cost_aud: battery.price_estimate_aud * quantity
  };
};