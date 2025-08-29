// Solar Panel Database - Top Australian Brands & Models

export interface PanelSpec {
  id: string;
  brand: string;
  model: string;
  power_watts: number;
  efficiency: number;
  warranty_years: number;
  tier: 1 | 2 | 3;
  price_estimate_aud: number;
  stc_eligible: boolean;
  common_names: string[]; // For OCR matching
}

export const SOLAR_PANELS: Record<string, PanelSpec> = {
  // REC Premium - APPROVED
  "rec-alpha-pure-400": {
    id: "rec-alpha-pure-400",
    brand: "REC",
    model: "Alpha Pure 400W",
    power_watts: 400,
    efficiency: 21.9,
    warranty_years: 25,
    tier: 1,
    price_estimate_aud: 320,
    stc_eligible: true,
    common_names: ["REC Alpha Pure", "REC400", "REC Alpha"]
  },
  "rec-alpha-pure-405": {
    id: "rec-alpha-pure-405",
    brand: "REC",
    model: "Alpha Pure 405W",
    power_watts: 405,
    efficiency: 22.3,
    warranty_years: 25,
    tier: 1,
    price_estimate_aud: 330,
    stc_eligible: true,
    common_names: ["REC Alpha Pure", "REC405", "REC Alpha"]
  },

  // AIKO Premium - APPROVED
  "aiko-stellar-n610": {
    id: "aiko-stellar-n610",
    brand: "AIKO",
    model: "Stellar-N610 610W",
    power_watts: 610,
    efficiency: 23.2,
    warranty_years: 25,
    tier: 1,
    price_estimate_aud: 380,
    stc_eligible: true,
    common_names: ["AIKO Stellar", "AIKO610", "Stellar N610"]
  },
  "aiko-stellar-n580": {
    id: "aiko-stellar-n580",
    brand: "AIKO",
    model: "Stellar-N580 580W",
    power_watts: 580,
    efficiency: 22.8,
    warranty_years: 25,
    tier: 1,
    price_estimate_aud: 360,
    stc_eligible: true,
    common_names: ["AIKO Stellar", "AIKO580", "Stellar N580"]
  },

  // LONGI Premium - APPROVED
  "longi-himo6-540": {
    id: "longi-himo6-540",
    brand: "LONGI",
    model: "Hi-MO6 540W",
    power_watts: 540,
    efficiency: 22.5,
    warranty_years: 25,
    tier: 1,
    price_estimate_aud: 350,
    stc_eligible: true,
    common_names: ["LONGi Hi-MO6", "LONGI540", "Hi-MO6"]
  },
  "longi-himo6-555": {
    id: "longi-himo6-555",
    brand: "LONGI",
    model: "Hi-MO6 555W",
    power_watts: 555,
    efficiency: 22.8,
    warranty_years: 25,
    tier: 1,
    price_estimate_aud: 365,
    stc_eligible: true,
    common_names: ["LONGi Hi-MO6", "LONGI555", "Hi-MO6"]
  },

  // JINKO Premium - APPROVED
  "jinko-tiger-neo-440": {
    id: "jinko-tiger-neo-440",
    brand: "JINKO",
    model: "Tiger Neo 440W",
    power_watts: 440,
    efficiency: 22.3,
    warranty_years: 25,
    tier: 1,
    price_estimate_aud: 290,
    stc_eligible: true,
    common_names: ["Jinko Tiger Neo", "JINKO440", "Tiger Neo"]
  },
  "jinko-tiger-neo-550": {
    id: "jinko-tiger-neo-550",
    brand: "JINKO",
    model: "Tiger Neo 550W",
    power_watts: 550,
    efficiency: 22.6,
    warranty_years: 25,
    tier: 1,
    price_estimate_aud: 340,
    stc_eligible: true,
    common_names: ["Jinko Tiger Neo", "JINKO550", "Tiger Neo"]
  },

  // TINDO Premium - APPROVED (Australian Made)
  "tindo-karra-340": {
    id: "tindo-karra-340",
    brand: "TINDO",
    model: "Karra 340W",
    power_watts: 340,
    efficiency: 20.8,
    warranty_years: 25,
    tier: 1,
    price_estimate_aud: 310,
    stc_eligible: true,
    common_names: ["Tindo Karra", "TINDO340", "Karra"]
  },
  "tindo-karra-350": {
    id: "tindo-karra-350",
    brand: "TINDO",
    model: "Karra 350W",
    power_watts: 350,
    efficiency: 21.2,
    warranty_years: 25,
    tier: 1,
    price_estimate_aud: 320,
    stc_eligible: true,
    common_names: ["Tindo Karra", "TINDO350", "Karra"]
  }
};

// Helper functions
export const getPanelsByBrand = (brand: string): PanelSpec[] => {
  return Object.values(SOLAR_PANELS).filter(panel => panel.brand === brand);
};

export const getPanelsByTier = (tier: 1 | 2 | 3): PanelSpec[] => {
  return Object.values(SOLAR_PANELS).filter(panel => panel.tier === tier);
};

export const searchPanels = (query: string): PanelSpec[] => {
  const searchTerm = query.toLowerCase();
  return Object.values(SOLAR_PANELS).filter(panel => 
    panel.brand.toLowerCase().includes(searchTerm) ||
    panel.model.toLowerCase().includes(searchTerm) ||
    panel.common_names.some(name => name.toLowerCase().includes(searchTerm))
  );
};

export const PANEL_BRANDS = Array.from(new Set(Object.values(SOLAR_PANELS).map(p => p.brand))).sort();