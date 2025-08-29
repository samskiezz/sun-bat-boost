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
  // Tesla Premium - APPROVED
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

  // Sigenergy - APPROVED
  "sigenergy-sigenstor-10": {
    id: "sigenergy-sigenstor-10",
    brand: "SIGENERGY",
    model: "SIGENSTOR 10.24kWh",
    capacity_kwh: 10.24,
    usable_capacity_kwh: 10.24,
    max_continuous_power_kw: 5.0,
    chemistry: "LiFePO4",
    warranty_years: 10,
    cycles: 6000,
    efficiency_percent: 95,
    price_estimate_aud: 8500,
    vpp_compatible: ["amber", "origin"],
    tier: 1,
    common_names: ["SIGENERGY SIGENSTOR", "SIGENSTOR", "SIG10"],
    dimensions: { width_mm: 600, height_mm: 800, depth_mm: 200, weight_kg: 100 }
  },
  "sigenergy-sigenstor-128": {
    id: "sigenergy-sigenstor-128",
    brand: "SIGENERGY",
    model: "SIGENSTOR 12.8kWh",
    capacity_kwh: 12.8,
    usable_capacity_kwh: 12.8,
    max_continuous_power_kw: 6.4,
    chemistry: "LiFePO4",
    warranty_years: 10,
    cycles: 6000,
    efficiency_percent: 95,
    price_estimate_aud: 10500,
    vpp_compatible: ["amber", "origin"],
    tier: 1,
    common_names: ["SIGENERGY SIGENSTOR", "SIGENSTOR", "SIG128"],
    dimensions: { width_mm: 600, height_mm: 1000, depth_mm: 200, weight_kg: 130 }
  },

  // Sungrow Hybrid - APPROVED
  "sungrow-sbr-96": {
    id: "sungrow-sbr-96",
    brand: "SUNGROW",
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
    tier: 1,
    common_names: ["Sungrow SBR", "SBR96", "SUN96"],
    dimensions: { width_mm: 605, height_mm: 755, depth_mm: 155, weight_kg: 89 }
  },
  "sungrow-sbr-128": {
    id: "sungrow-sbr-128",
    brand: "SUNGROW",
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
    tier: 1,
    common_names: ["Sungrow SBR", "SBR128", "SUN128"],
    dimensions: { width_mm: 605, height_mm: 1005, depth_mm: 155, weight_kg: 119 }
  },

  // Goodwe - APPROVED  
  "goodwe-lynx-home-10": {
    id: "goodwe-lynx-home-10",
    brand: "GOODWE",
    model: "Lynx Home U 10.1kWh",
    capacity_kwh: 10.1,
    usable_capacity_kwh: 9.1,
    max_continuous_power_kw: 5.0,
    chemistry: "LiFePO4",
    warranty_years: 10,
    cycles: 6000,
    efficiency_percent: 95,
    price_estimate_aud: 7800,
    vpp_compatible: ["amber", "origin"],
    tier: 1,
    common_names: ["Goodwe Lynx Home", "Lynx Home", "GW10"],
    dimensions: { width_mm: 570, height_mm: 750, depth_mm: 147, weight_kg: 104 }
  },

  // FoxESS - APPROVED
  "foxess-ep10": {
    id: "foxess-ep10",
    brand: "FOX ESS",
    model: "EP10 Energy Pod 10.24kWh",
    capacity_kwh: 10.24,
    usable_capacity_kwh: 9.2,
    max_continuous_power_kw: 5.0,
    chemistry: "LiFePO4",
    warranty_years: 10,
    cycles: 6000,
    efficiency_percent: 95,
    price_estimate_aud: 8200,
    vpp_compatible: ["amber", "origin"],
    tier: 1,
    common_names: ["FoxESS EP10", "EP10", "FOX10"],
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