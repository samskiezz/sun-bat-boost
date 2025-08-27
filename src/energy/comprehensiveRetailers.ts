// Comprehensive Australian Energy Retailers Database
// Updated 2025 with all major retailers across all states

export interface RetailerInfo {
  brand: string;
  baseUri?: string; // CDR endpoint where available
  displayName: string;
  states: string[];
  type: 'major' | 'regional' | 'green' | 'commercial';
  hasWebscraping?: boolean; // For non-CDR retailers
  websiteUrl?: string;
}

// Major National Retailers (Big 3 + others)
export const MAJOR_RETAILERS: RetailerInfo[] = [
  {
    brand: "agl",
    baseUri: "https://cdr.energymadeeasy.gov.au/agl",
    displayName: "AGL Energy",
    states: ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "ACT"],
    type: "major"
  },
  {
    brand: "origin",
    baseUri: "https://cdr.energymadeeasy.gov.au/origin",
    displayName: "Origin Energy",
    states: ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "ACT"],
    type: "major"
  },
  {
    brand: "energyaustralia",
    baseUri: "https://cdr.energymadeeasy.gov.au/energyaustralia",
    displayName: "EnergyAustralia",
    states: ["NSW", "VIC", "QLD", "SA", "TAS", "ACT"],
    type: "major"
  }
];

// CDR Enabled Retailers (have official APIs)
export const CDR_RETAILERS: RetailerInfo[] = [
  ...MAJOR_RETAILERS,
  {
    brand: "red-energy",
    baseUri: "https://cdr.energymadeeasy.gov.au/red-energy",
    displayName: "Red Energy",
    states: ["NSW", "VIC", "QLD", "SA", "ACT"],
    type: "major"
  },
  {
    brand: "alinta-energy",
    baseUri: "https://cdr.energymadeeasy.gov.au/alinta-energy",
    displayName: "Alinta Energy",
    states: ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "ACT"],
    type: "major"
  },
  {
    brand: "simply-energy",
    baseUri: "https://cdr.energymadeeasy.gov.au/simply-energy",
    displayName: "Simply Energy",
    states: ["NSW", "VIC", "QLD", "SA", "ACT"],
    type: "major"
  },
  {
    brand: "momentum-energy",
    baseUri: "https://cdr.energymadeeasy.gov.au/momentum-energy",
    displayName: "Momentum Energy",
    states: ["NSW", "VIC", "QLD", "SA", "ACT"],
    type: "major"
  },
  {
    brand: "powershop",
    baseUri: "https://cdr.energymadeeasy.gov.au/powershop",
    displayName: "Powershop",
    states: ["NSW", "VIC", "QLD", "SA", "ACT"],
    type: "green"
  }
];

// Other Major Retailers (non-CDR but significant market share)
export const OTHER_MAJOR_RETAILERS: RetailerInfo[] = [
  {
    brand: "energy-locals",
    displayName: "Energy Locals",
    states: ["NSW", "VIC", "QLD", "SA", "ACT"],
    type: "green",
    hasWebscraping: true,
    websiteUrl: "https://www.energylocals.com.au/"
  },
  {
    brand: "diamond-energy",
    displayName: "Diamond Energy",
    states: ["NSW", "VIC", "QLD", "SA", "ACT"],
    type: "major",
    hasWebscraping: true,
    websiteUrl: "https://www.diamondenergy.com.au/"
  },
  {
    brand: "dodo-power",
    displayName: "Dodo Power & Gas",
    states: ["NSW", "VIC", "QLD", "SA", "ACT"],
    type: "major",
    hasWebscraping: true,
    websiteUrl: "https://www.dodo.com/"
  },
  {
    brand: "globird-energy",
    displayName: "GloBird Energy",
    states: ["NSW", "VIC", "QLD", "SA", "ACT"],
    type: "major",
    hasWebscraping: true,
    websiteUrl: "https://www.globirdenergy.com.au/"
  },
  {
    brand: "lumo-energy",
    displayName: "Lumo Energy",
    states: ["NSW", "VIC", "QLD", "SA", "ACT"],
    type: "major",
    hasWebscraping: true,
    websiteUrl: "https://www.lumoenergy.com.au/"
  },
  {
    brand: "people-energy",
    displayName: "People Energy",
    states: ["NSW", "VIC", "QLD", "SA", "ACT"],
    type: "green",
    hasWebscraping: true,
    websiteUrl: "https://www.peopleenergy.com.au/"
  },
  {
    brand: "sanctuary-energy",
    displayName: "Sanctuary Energy",
    states: ["NSW", "VIC", "QLD", "SA", "ACT"],
    type: "green",
    hasWebscraping: true,
    websiteUrl: "https://www.sanctuaryenergy.com.au/"
  },
  {
    brand: "sumo-power",
    displayName: "Sumo Power",
    states: ["NSW", "VIC", "QLD", "SA", "ACT"],
    type: "major",
    hasWebscraping: true,
    websiteUrl: "https://www.sumopower.com.au/"
  },
  {
    brand: "amber-electric",
    displayName: "Amber Electric",
    states: ["NSW", "VIC", "QLD", "SA", "ACT"],
    type: "green",
    hasWebscraping: true,
    websiteUrl: "https://www.amber.com.au/"
  },
  {
    brand: "nectr",
    displayName: "Nectr",
    states: ["NSW", "VIC", "QLD", "SA", "ACT"],
    type: "green",
    hasWebscraping: true,
    websiteUrl: "https://www.nectr.com.au/"
  },
  {
    brand: "kogan-energy",
    displayName: "Kogan Energy",
    states: ["NSW", "VIC", "QLD", "SA", "ACT"],
    type: "major",
    hasWebscraping: true,
    websiteUrl: "https://www.kogan.com/au/energy/"
  },
  {
    brand: "ovo-energy",
    displayName: "OVO Energy",
    states: ["NSW", "VIC", "SA"],
    type: "green",
    hasWebscraping: true,
    websiteUrl: "https://www.ovoenergy.com.au/"
  },
  {
    brand: "mojo-power",
    displayName: "Mojo Power",
    states: ["NSW", "VIC", "QLD", "SA"],
    type: "green",
    hasWebscraping: true,
    websiteUrl: "https://www.mojopower.com.au/"
  },
  {
    brand: "tango-energy",
    displayName: "Tango Energy",
    states: ["NSW", "VIC", "QLD", "SA", "ACT"],
    type: "major",
    hasWebscraping: true,
    websiteUrl: "https://www.tangoenergy.com/"
  },
  {
    brand: "discover-energy",
    displayName: "Discover Energy",
    states: ["NSW", "VIC", "QLD", "SA", "ACT"],
    type: "major",
    hasWebscraping: true,
    websiteUrl: "https://www.discoverenergy.com.au/"
  }
];

// State-Specific and Regional Retailers
export const REGIONAL_RETAILERS: RetailerInfo[] = [
  // NSW Specific
  {
    brand: "actewagl",
    displayName: "ActewAGL",
    states: ["ACT", "NSW"],
    type: "regional",
    hasWebscraping: true,
    websiteUrl: "https://www.actewagl.com.au/"
  },
  
  // VIC Specific
  {
    brand: "1st-energy",
    displayName: "1st Energy",
    states: ["VIC"],
    type: "regional",
    hasWebscraping: true,
    websiteUrl: "https://www.1stenergy.com.au/"
  },
  
  // QLD Specific
  {
    brand: "ergon-energy",
    displayName: "Ergon Energy Retail",
    states: ["QLD"],
    type: "regional",
    hasWebscraping: true,
    websiteUrl: "https://www.ergon.com.au/"
  },
  {
    brand: "energex",
    displayName: "Energex",
    states: ["QLD"],
    type: "regional",
    hasWebscraping: true,
    websiteUrl: "https://www.energex.com.au/"
  },
  {
    brand: "click-energy",
    displayName: "Click Energy",
    states: ["QLD", "NSW", "VIC", "SA"],
    type: "regional",
    hasWebscraping: true,
    websiteUrl: "https://www.clickenergy.com.au/"
  },
  
  // SA Specific
  {
    brand: "covas",
    displayName: "CovaU",
    states: ["SA"],
    type: "regional",
    hasWebscraping: true,
    websiteUrl: "https://www.covau.com/"
  },
  
  // WA Specific (different market structure)
  {
    brand: "synergy",
    displayName: "Synergy",
    states: ["WA"],
    type: "regional",
    hasWebscraping: true,
    websiteUrl: "https://www.synergy.net.au/"
  },
  {
    brand: "horizon-power",
    displayName: "Horizon Power",
    states: ["WA"],
    type: "regional",
    hasWebscraping: true,
    websiteUrl: "https://www.horizonpower.com.au/"
  },
  {
    brand: "kleenheat",
    displayName: "Kleenheat",
    states: ["WA"],
    type: "regional",
    hasWebscraping: true,
    websiteUrl: "https://kleenheat.com.au/"
  },
  
  // TAS Specific
  {
    brand: "aurora-energy",
    displayName: "Aurora Energy",
    states: ["TAS"],
    type: "regional",
    hasWebscraping: true,
    websiteUrl: "https://www.auroraenergy.com.au/"
  },
  
  // NT Specific
  {
    brand: "jacana-energy",
    displayName: "Jacana Energy",
    states: ["NT"],
    type: "regional",
    hasWebscraping: true,
    websiteUrl: "https://www.jacanaenergy.com.au/"
  }
];

// Commercial/Business Focused Retailers
export const COMMERCIAL_RETAILERS: RetailerInfo[] = [
  {
    brand: "next-business-energy",
    displayName: "Next Business Energy",
    states: ["NSW", "VIC", "QLD", "SA", "ACT"],
    type: "commercial",
    hasWebscraping: true,
    websiteUrl: "https://www.nextbusinessenergy.com.au/"
  },
  {
    brand: "pacific-hydro",
    displayName: "Pacific Hydro Retail",
    states: ["VIC", "SA"],
    type: "commercial",
    hasWebscraping: true,
    websiteUrl: "https://www.pacifichydro.com.au/"
  },
  {
    brand: "flow-power",
    displayName: "Flow Power",
    states: ["NSW", "VIC", "QLD", "SA", "ACT"],
    type: "commercial",
    hasWebscraping: true,
    websiteUrl: "https://www.flowpower.com.au/"
  },
  {
    brand: "commander-power",
    displayName: "Commander Power & Gas",
    states: ["NSW", "VIC", "QLD", "SA"],
    type: "commercial",
    hasWebscraping: true,
    websiteUrl: "https://www.commanderpower.com.au/"
  }
];

// All Retailers Combined
export const ALL_RETAILERS: RetailerInfo[] = [
  ...CDR_RETAILERS,
  ...OTHER_MAJOR_RETAILERS,
  ...REGIONAL_RETAILERS,
  ...COMMERCIAL_RETAILERS
];

// Distribution Network Service Providers (DNSPs) by State
export const DNSP_BY_STATE = {
  NSW: [
    { network: "Ausgrid", regions: ["Sydney", "Central Coast", "Hunter"], postcode_ranges: ["2000-2234", "2250-2299", "2300-2339"] },
    { network: "Endeavour Energy", regions: ["Western Sydney", "Blue Mountains", "Central West"], postcode_ranges: ["2740-2799", "2145-2179", "2555-2574"] },
    { network: "Essential Energy", regions: ["Regional NSW", "Far West"], postcode_ranges: ["2340-2739", "2800-2898"] }
  ],
  VIC: [
    { network: "CitiPower", regions: ["Melbourne CBD", "Inner Melbourne"], postcode_ranges: ["3000-3031", "3141-3181"] },
    { network: "Powercor", regions: ["Western Victoria", "Geelong"], postcode_ranges: ["3200-3399", "3500-3699"] },
    { network: "Jemena", regions: ["Northern Melbourne"], postcode_ranges: ["3032-3099", "3420-3499"] },
    { network: "United Energy", regions: ["South Eastern Melbourne", "Mornington Peninsula"], postcode_ranges: ["3100-3140", "3182-3199", "3910-3944"] },
    { network: "AusNet Services", regions: ["Eastern Victoria", "North Eastern Victoria"], postcode_ranges: ["3700-3899", "3400-3419"] }
  ],
  QLD: [
    { network: "Energex", regions: ["South East Queensland", "Brisbane", "Gold Coast"], postcode_ranges: ["4000-4207", "4300-4399", "4500-4519"] },
    { network: "Ergon Energy", regions: ["Regional Queensland", "Cairns", "Townsville"], postcode_ranges: ["4208-4299", "4400-4499", "4520-4899"] }
  ],
  SA: [
    { network: "SA Power Networks", regions: ["All of South Australia"], postcode_ranges: ["5000-5999"] }
  ],
  WA: [
    { network: "Western Power", regions: ["South West Interconnected System"], postcode_ranges: ["6000-6199", "6400-6499"] },
    { network: "Horizon Power", regions: ["Regional WA", "Pilbara", "Kimberley"], postcode_ranges: ["6200-6399", "6500-6999"] }
  ],
  TAS: [
    { network: "TasNetworks", regions: ["All of Tasmania"], postcode_ranges: ["7000-7999"] }
  ],
  ACT: [
    { network: "Evoenergy", regions: ["Australian Capital Territory"], postcode_ranges: ["2600-2618"] }
  ],
  NT: [
    { network: "Power and Water Corporation", regions: ["Northern Territory"], postcode_ranges: ["0800-0899"] }
  ]
};

// All Supported States (including WA/NT)
export const ALL_SUPPORTED_STATES = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT'] as const;
export type AllSupportedState = typeof ALL_SUPPORTED_STATES[number];

// Helper functions
export function getRetailersByState(state: string): RetailerInfo[] {
  return ALL_RETAILERS.filter(retailer => retailer.states.includes(state));
}

export function getDnspByState(state: string) {
  return DNSP_BY_STATE[state as keyof typeof DNSP_BY_STATE] || [];
}

export function getRetailerByBrand(brand: string): RetailerInfo | undefined {
  return ALL_RETAILERS.find(retailer => retailer.brand === brand);
}

export function getPostcodeNetwork(postcode: string, state: string): string {
  const dnsps = getDnspByState(state);
  const code = parseInt(postcode);
  
  for (const dnsp of dnsps) {
    for (const range of dnsp.postcode_ranges) {
      const [start, end] = range.split('-').map(p => parseInt(p));
      if (code >= start && code <= end) {
        return dnsp.network;
      }
    }
  }
  
  // Default fallback
  return dnsps.length > 0 ? dnsps[0].network : "Unknown";
}
