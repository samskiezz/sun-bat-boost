// Panel Fitting Calculations for 440W Solar Panels

export interface PanelSpecs {
  wattage: number;
  width_m: number;
  height_m: number;
  area_m2: number;
}

export interface FacetPanelFit {
  facetArea: number;
  maxPanels: number;
  installedKw: number;
  utilizationRate: number;
  orientationFactor: number;
  adjustedKw: number;
}

// Standard 440W panel dimensions (typical Australian residential)
export const PANEL_440W: PanelSpecs = {
  wattage: 440,
  width_m: 2.13,  // Corrected typical dimensions
  height_m: 1.13,
  area_m2: 2.13 * 1.13 // ~2.4m²
};

// Installation factors
export const PACKING_EFFICIENCY = 0.78; // 78% realistic packing efficiency
export const MIN_CLEARANCE_M = 0.5; // Minimum clearance from edges

// Orientation production factors (Australian context)
export const ORIENTATION_FACTORS = {
  north: 1.0,    // Optimal
  east: 0.87,    // Good morning sun
  west: 0.87,    // Good afternoon sun  
  south: 0.65,   // Poor orientation
  northeast: 0.95,
  northwest: 0.95,
  southeast: 0.82,
  southwest: 0.82
} as const;

export function calculatePanelFit(
  facetAreaSqm: number, 
  orientation: keyof typeof ORIENTATION_FACTORS = 'north'
): FacetPanelFit {
  
  // Calculate usable area after clearances
  const usableArea = Math.max(0, facetAreaSqm - (MIN_CLEARANCE_M * 4)); // Rough clearance deduction
  
  // Calculate max panels considering packing efficiency
  const maxPanels = Math.floor((usableArea * PACKING_EFFICIENCY) / PANEL_440W.area_m2);
  
  // Calculate installed capacity
  const installedKw = (maxPanels * PANEL_440W.wattage) / 1000;
  
  // Apply orientation factor
  const orientationFactor = ORIENTATION_FACTORS[orientation] || 1.0;
  const adjustedKw = installedKw * orientationFactor;
  
  // Calculate utilization rate
  const utilizationRate = maxPanels > 0 ? (maxPanels * PANEL_440W.area_m2) / facetAreaSqm : 0;

  return {
    facetArea: facetAreaSqm,
    maxPanels,
    installedKw,
    utilizationRate,
    orientationFactor,
    adjustedKw
  };
}

export function calculateSystemFit(facets: Array<{
  areaSqm: number;
  orientation: keyof typeof ORIENTATION_FACTORS;
  shadeIndex?: number;
}>): {
  totalPanels: number;
  totalInstalledKw: number;
  totalAdjustedKw: number;
  averageUtilization: number;
  facetBreakdown: Array<FacetPanelFit & { shadeAdjustedKw: number }>;
  fitMessage: string;
} {
  
  const facetBreakdown = facets.map(facet => {
    const fit = calculatePanelFit(facet.areaSqm, facet.orientation);
    const shadeAdjustedKw = fit.adjustedKw * (1 - (facet.shadeIndex || 0));
    return { ...fit, shadeAdjustedKw };
  });

  const totalPanels = facetBreakdown.reduce((sum, fit) => sum + fit.maxPanels, 0);
  const totalInstalledKw = facetBreakdown.reduce((sum, fit) => sum + fit.installedKw, 0);
  const totalAdjustedKw = facetBreakdown.reduce((sum, fit) => sum + fit.adjustedKw, 0);
  const totalShadeAdjustedKw = facetBreakdown.reduce((sum, fit) => sum + fit.shadeAdjustedKw, 0);
  
  const totalArea = facets.reduce((sum, f) => sum + f.areaSqm, 0);
  const averageUtilization = totalArea > 0 ? 
    facetBreakdown.reduce((sum, fit) => sum + (fit.utilizationRate * fit.facetArea), 0) / totalArea : 0;

  // Generate fit message
  let fitMessage = "";
  if (totalPanels === 0) {
    fitMessage = "No panels will fit on the selected roof areas. Consider larger roof sections.";
  } else if (totalPanels < 10) {
    fitMessage = `Small system: ${totalPanels} panels will fit. Consider expanding roof coverage for better economics.`;
  } else if (totalPanels < 20) {
    fitMessage = `Medium system: ${totalPanels} panels will fit comfortably. Good balance of size and cost.`;
  } else {
    fitMessage = `Large system: ${totalPanels} panels will fit. Excellent capacity for high energy users.`;
  }

  return {
    totalPanels,
    totalInstalledKw,
    totalAdjustedKw: totalShadeAdjustedKw,
    averageUtilization,
    facetBreakdown,
    fitMessage
  };
}

// Australian top solar brands
export const AU_SOLAR_BRANDS = {
  panels: [
    { name: "Jinko Solar", model: "Tiger Neo 440W", efficiency: "22.3%", warranty: "25 years" },
    { name: "LONGi Solar", model: "Hi-MO 6 440W", efficiency: "22.5%", warranty: "25 years" },
    { name: "Trina Solar", model: "Vertex S+ 440W", efficiency: "22.2%", warranty: "25 years" },
    { name: "REC Solar", model: "Alpha Pure-R 440W", efficiency: "22.3%", warranty: "25 years" },
    { name: "Qcells", model: "Q.PEAK DUO BLK-G10+ 440W", efficiency: "21.9%", warranty: "25 years" }
  ],
  inverters: [
    { name: "Fronius", model: "Primo GEN24 Plus", efficiency: "97.1%", warranty: "10 years" },
    { name: "Sungrow", model: "SH10RT", efficiency: "97.6%", warranty: "10 years" },
    { name: "GoodWe", model: "GW10K-ET", efficiency: "97.6%", warranty: "10 years" },
    { name: "SolarEdge", model: "HD-Wave SE10000H", efficiency: "99.2%", warranty: "12 years" }
  ],
  batteries: [
    { name: "Tesla Powerwall", model: "Powerwall 3", capacity: "13.5 kWh", warranty: "10 years" },
    { name: "BYD Battery-Box", model: "Premium HVS 12.8", capacity: "12.8 kWh", warranty: "10 years" },
    { name: "Sungrow SBR", model: "SBR256", capacity: "25.6 kWh", warranty: "10 years" },
    { name: "LG RESU", model: "RESU16H Prime", capacity: "16 kWh", warranty: "10 years" },
    { name: "Enphase IQ Battery", model: "IQ Battery 5P", capacity: "5 kWh", warranty: "15 years" }
  ]
} as const;