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
  // Tier 1 Premium Brands
  "lg-neon-2-370": {
    id: "lg-neon-2-370",
    brand: "LG",
    model: "NeON 2 370W",
    power_watts: 370,
    efficiency: 21.1,
    warranty_years: 25,
    tier: 1,
    price_estimate_aud: 280,
    stc_eligible: true,
    common_names: ["LG NeON 2", "LG370", "LG NEON2"]
  },
  "lg-neon-r-380": {
    id: "lg-neon-r-380",
    brand: "LG",
    model: "NeON R 380W",
    power_watts: 380,
    efficiency: 21.7,
    warranty_years: 25,
    tier: 1,
    price_estimate_aud: 295,
    stc_eligible: true,
    common_names: ["LG NeON R", "LG380", "LG NEONR"]
  },
  "sunpower-maxeon-3-400": {
    id: "sunpower-maxeon-3-400",
    brand: "SunPower",
    model: "Maxeon 3 400W",
    power_watts: 400,
    efficiency: 22.6,
    warranty_years: 40,
    tier: 1,
    price_estimate_aud: 420,
    stc_eligible: true,
    common_names: ["SunPower Maxeon 3", "Maxeon3", "SP400"]
  },
  "sunpower-maxeon-5-415": {
    id: "sunpower-maxeon-5-415",
    brand: "SunPower",
    model: "Maxeon 5 415W",
    power_watts: 415,
    efficiency: 22.8,
    warranty_years: 40,
    tier: 1,
    price_estimate_aud: 450,
    stc_eligible: true,
    common_names: ["SunPower Maxeon 5", "Maxeon5", "SP415"]
  },
  "panasonic-hit-330": {
    id: "panasonic-hit-330",
    brand: "Panasonic",
    model: "HIT 330W",
    power_watts: 330,
    efficiency: 19.7,
    warranty_years: 25,
    tier: 1,
    price_estimate_aud: 260,
    stc_eligible: true,
    common_names: ["Panasonic HIT", "PANA330", "HIT330"]
  },
  "panasonic-evpv-370": {
    id: "panasonic-evpv-370",
    brand: "Panasonic",
    model: "EVPV 370W",
    power_watts: 370,
    efficiency: 21.2,
    warranty_years: 25,
    tier: 1,
    price_estimate_aud: 285,
    stc_eligible: true,
    common_names: ["Panasonic EVPV", "PANA370", "EVPV370"]
  },
  "rec-alpha-pure-405": {
    id: "rec-alpha-pure-405",
    brand: "REC",
    model: "Alpha Pure 405W",
    power_watts: 405,
    efficiency: 21.9,
    warranty_years: 20,
    tier: 1,
    price_estimate_aud: 315,
    stc_eligible: true,
    common_names: ["REC Alpha Pure", "REC405", "Alpha Pure"]
  },
  "rec-alpha-black-400": {
    id: "rec-alpha-black-400",
    brand: "REC",
    model: "Alpha Black 400W",
    power_watts: 400,
    efficiency: 21.7,
    warranty_years: 20,
    tier: 1,
    price_estimate_aud: 310,
    stc_eligible: true,
    common_names: ["REC Alpha Black", "REC400", "Alpha Black"]
  },

  // Tier 1 Popular Brands
  "jinko-tiger-pro-540": {
    id: "jinko-tiger-pro-540",
    brand: "Jinko Solar",
    model: "Tiger Pro 540W",
    power_watts: 540,
    efficiency: 20.9,
    warranty_years: 12,
    tier: 1,
    price_estimate_aud: 190,
    stc_eligible: true,
    common_names: ["Jinko Tiger Pro", "JKM540", "Tiger Pro"]
  },
  "jinko-tiger-neo-580": {
    id: "jinko-tiger-neo-580",
    brand: "Jinko Solar",
    model: "Tiger Neo 580W",
    power_watts: 580,
    efficiency: 22.3,
    warranty_years: 12,
    tier: 1,
    price_estimate_aud: 210,
    stc_eligible: true,
    common_names: ["Jinko Tiger Neo", "JKM580", "Tiger Neo"]
  },
  "longi-himo-4-405": {
    id: "longi-himo-4-405",
    brand: "LONGi",
    model: "Hi-MO 4 405W",
    power_watts: 405,
    efficiency: 20.6,
    warranty_years: 12,
    tier: 1,
    price_estimate_aud: 175,
    stc_eligible: true,
    common_names: ["LONGi Hi-MO 4", "LR4-72HPH", "HiMO4"]
  },
  "longi-himo-5-540": {
    id: "longi-himo-5-540",
    brand: "LONGi",
    model: "Hi-MO 5 540W",
    power_watts: 540,
    efficiency: 21.3,
    warranty_years: 12,
    tier: 1,
    price_estimate_aud: 195,
    stc_eligible: true,
    common_names: ["LONGi Hi-MO 5", "LR5-72HBD", "HiMO5"]
  },
  "canadian-hiku-6-410": {
    id: "canadian-hiku-6-410",
    brand: "Canadian Solar",
    model: "HiKu 6 410W",
    power_watts: 410,
    efficiency: 20.9,
    warranty_years: 12,
    tier: 1,
    price_estimate_aud: 180,
    stc_eligible: true,
    common_names: ["Canadian HiKu 6", "CS6W-410MS", "HiKu6"]
  },
  "canadian-hiku-7-575": {
    id: "canadian-hiku-7-575",
    brand: "Canadian Solar",
    model: "HiKu 7 575W",
    power_watts: 575,
    efficiency: 22.5,
    warranty_years: 12,
    tier: 1,
    price_estimate_aud: 220,
    stc_eligible: true,
    common_names: ["Canadian HiKu 7", "CS7L-575MS", "HiKu7"]
  },
  "trina-vertex-s-405": {
    id: "trina-vertex-s-405",
    brand: "Trina Solar",
    model: "Vertex S 405W",
    power_watts: 405,
    efficiency: 20.8,
    warranty_years: 12,
    tier: 1,
    price_estimate_aud: 175,
    stc_eligible: true,
    common_names: ["Trina Vertex S", "TSM-405DE09R", "Vertex S"]
  },
  "trina-vertex-s-500": {
    id: "trina-vertex-s-500",
    brand: "Trina Solar",
    model: "Vertex S 500W",
    power_watts: 500,
    efficiency: 21.2,
    warranty_years: 12,
    tier: 1,
    price_estimate_aud: 195,
    stc_eligible: true,
    common_names: ["Trina Vertex S", "TSM-500DE20A", "Vertex S 500"]
  },
  "ja-deep-blue-3-445": {
    id: "ja-deep-blue-3-445",
    brand: "JA Solar",
    model: "Deep Blue 3.0 445W",
    power_watts: 445,
    efficiency: 21.3,
    warranty_years: 12,
    tier: 1,
    price_estimate_aud: 185,
    stc_eligible: true,
    common_names: ["JA Deep Blue 3", "JAM72S20", "Deep Blue"]
  },
  "risen-titan-410": {
    id: "risen-titan-410",
    brand: "Risen",
    model: "Titan 410W",
    power_watts: 410,
    efficiency: 21.0,
    warranty_years: 12,
    tier: 1,
    price_estimate_aud: 170,
    stc_eligible: true,
    common_names: ["Risen Titan", "RSM144-6-410M", "Titan"]
  },

  // Tier 2 Value Brands
  "seraphim-eclipse-400": {
    id: "seraphim-eclipse-400",
    brand: "Seraphim",
    model: "Eclipse 400W",
    power_watts: 400,
    efficiency: 20.5,
    warranty_years: 12,
    tier: 2,
    price_estimate_aud: 165,
    stc_eligible: true,
    common_names: ["Seraphim Eclipse", "SRP-400-BMB", "Eclipse"]
  },
  "astronergy-cheetah-410": {
    id: "astronergy-cheetah-410",
    brand: "Astronergy",
    model: "Cheetah 410W",
    power_watts: 410,
    efficiency: 20.7,
    warranty_years: 12,
    tier: 2,
    price_estimate_aud: 170,
    stc_eligible: true,
    common_names: ["Astronergy Cheetah", "ASTRO410", "Cheetah"]
  },
  "phono-pe-g2-395": {
    id: "phono-pe-g2-395",
    brand: "Phono Solar",
    model: "PE G2 395W",
    power_watts: 395,
    efficiency: 20.3,
    warranty_years: 12,
    tier: 2,
    price_estimate_aud: 160,
    stc_eligible: true,
    common_names: ["Phono PE G2", "PS395M4-20", "PE G2"]
  },
  "qcells-qpeak-duo-l-g5-405": {
    id: "qcells-qpeak-duo-l-g5-405",
    brand: "Q CELLS",
    model: "Q.PEAK DUO L-G5 405W",
    power_watts: 405,
    efficiency: 20.6,
    warranty_years: 12,
    tier: 1,
    price_estimate_aud: 190,
    stc_eligible: true,
    common_names: ["Q CELLS Q.PEAK DUO", "QPK405", "QPEAK DUO"]
  },
  "qcells-qpeak-duo-ml-g10-410": {
    id: "qcells-qpeak-duo-ml-g10-410",
    brand: "Q CELLS",
    model: "Q.PEAK DUO ML-G10 410W",
    power_watts: 410,
    efficiency: 20.9,
    warranty_years: 12,
    tier: 1,
    price_estimate_aud: 195,
    stc_eligible: true,
    common_names: ["Q CELLS Q.PEAK DUO ML", "QPK410", "QPEAK DUO ML"]
  },

  // Australian Brands
  "sunman-earcr-350": {
    id: "sunman-earcr-350",
    brand: "Sunman",
    model: "eArc 350W",
    power_watts: 350,
    efficiency: 19.8,
    warranty_years: 10,
    tier: 2,
    price_estimate_aud: 155,
    stc_eligible: true,
    common_names: ["Sunman eArc", "SM350", "eArc"]
  },
  "winaico-wsp-340": {
    id: "winaico-wsp-340",
    brand: "Winaico",
    model: "WSP 340W",
    power_watts: 340,
    efficiency: 19.6,
    warranty_years: 12,
    tier: 2,
    price_estimate_aud: 150,
    stc_eligible: true,
    common_names: ["Winaico WSP", "WIN340", "WSP340"]
  },
  "hyundai-shi-340": {
    id: "hyundai-shi-340",
    brand: "Hyundai",
    model: "SHI 340W",
    power_watts: 340,
    efficiency: 19.5,
    warranty_years: 12,
    tier: 2,
    price_estimate_aud: 145,
    stc_eligible: true,
    common_names: ["Hyundai SHI", "HYU340", "SHI340"]
  },

  // Budget Tier 3 Options
  "znshine-zxm6-390": {
    id: "znshine-zxm6-390",
    brand: "ZnShine",
    model: "ZXM6 390W",
    power_watts: 390,
    efficiency: 20.1,
    warranty_years: 10,
    tier: 3,
    price_estimate_aud: 140,
    stc_eligible: true,
    common_names: ["ZnShine ZXM6", "ZNS390", "ZXM6"]
  },
  "byd-ph-350": {
    id: "byd-ph-350",
    brand: "BYD",
    model: "PH 350W",
    power_watts: 350,
    efficiency: 18.9,
    warranty_years: 10,
    tier: 3,
    price_estimate_aud: 135,
    stc_eligible: true,
    common_names: ["BYD PH", "BYD350", "PH350"]
  },
  "boviet-bf-340": {
    id: "boviet-bf-340",
    brand: "Boviet Solar",
    model: "BF 340W",
    power_watts: 340,
    efficiency: 19.2,
    warranty_years: 10,
    tier: 3,
    price_estimate_aud: 130,
    stc_eligible: true,
    common_names: ["Boviet BF", "BOV340", "BF340"]
  },
  "recom-rcy-320": {
    id: "recom-rcy-320",
    brand: "RECOM",
    model: "RCY 320W",
    power_watts: 320,
    efficiency: 18.7,
    warranty_years: 10,
    tier: 3,
    price_estimate_aud: 125,
    stc_eligible: true,
    common_names: ["RECOM RCY", "RCM320", "RCY320"]
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