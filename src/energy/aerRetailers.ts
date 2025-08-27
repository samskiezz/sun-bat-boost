// AER Energy Made Easy Retailer Base URIs
// Source: CDR Energy Retailer Base URIs and CDR Brands (AER published list)

export type RetailerBrand = { 
  brand: string; 
  baseUri: string; 
  displayName?: string;
};

export const AER_RETAILERS: RetailerBrand[] = [
  { 
    brand: "agl", 
    baseUri: "https://cdr.energymadeeasy.gov.au/agl",
    displayName: "AGL Energy"
  },
  { 
    brand: "origin", 
    baseUri: "https://cdr.energymadeeasy.gov.au/origin",
    displayName: "Origin Energy"
  },
  { 
    brand: "energyaustralia", 
    baseUri: "https://cdr.energymadeeasy.gov.au/energyaustralia",
    displayName: "EnergyAustralia"
  },
  { 
    brand: "red-energy", 
    baseUri: "https://cdr.energymadeeasy.gov.au/red-energy",
    displayName: "Red Energy"
  },
  { 
    brand: "alinta-energy", 
    baseUri: "https://cdr.energymadeeasy.gov.au/alinta-energy",
    displayName: "Alinta Energy"
  },
  { 
    brand: "simply-energy", 
    baseUri: "https://cdr.energymadeeasy.gov.au/simply-energy",
    displayName: "Simply Energy"
  }
];

// Jurisdictions supported by AER PRD (excludes WA/NT)
export const SUPPORTED_STATES = ['NSW', 'VIC', 'QLD', 'SA', 'TAS', 'ACT'] as const;
export type SupportedState = typeof SUPPORTED_STATES[number];