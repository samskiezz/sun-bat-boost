// Regex patterns for OCR extraction

export const patterns = {
  // Brand patterns (case insensitive)
  brands: {
    solar: /(?:sigenergy|sigen|sigenpower|sungrow|tesla|alpha\s*ess|jinko|longi|trina|aiko|rec|ja\s*solar|canadian\s*solar|qcells|lg|panasonic|sunpower|solar\s*edge|fronius|sma|growatt|huawei|goodwe)/gi,
    battery: /(?:sigenergy|sigen|tesla|alpha\s*ess|sonnen|byd|pylontech|powerwall|enphase|lg\s*chem|samsung|bmz)/gi,
    inverter: /(?:sma|fronius|solar\s*edge|growatt|sungrow|huawei|goodwe|abb|schneider|delta|kostal|victron)/gi,
  },

  // Battery patterns
  battery: {
    // Stack patterns: "2x16 kWh", "stack of 3 x 13.5 kWh"
    stack: /(?:stack|module|battery)\s*(?:of)?\s*(\d{1,2})\s*(?:x|×)\s*(\d{1,2}(?:\.\d+)?)\s*(k?wh)/gi,
    
    // Capacity patterns: "25 kWh", "13.5kWh usable"
    capacity: /((?:\d{1,3}(?:\.\d+)?)\s*(?:kwh|kw\s*h|kw h|wh))/gi,
    
    // Model with capacity: "SIGENSTOR 25kWh"
    modelCapacity: /([A-Z][A-Z0-9\-\.]{2,})\s*(\d{1,2}(?:\.\d+)?)\s*(?:kwh|kw\s*h)/gi,
  },

  // Panel patterns
  panel: {
    // Count x Watts: "24 x 440W", "18×415 watts"
    countWatts: /(\d{1,3})\s*(?:x|×)\s*(\d{3,4})\s*w(?:att)?s?/gi,
    
    // Array size: "10.56 kW DC", "7.2kW array"
    arraySize: /(?<!per\s)(\d{1,2}(?:\.\d+)?)\s*kw\s*(?:dc|array)?/gi,
    
    // Model patterns: allow letters, numbers, dashes
    model: /([A-Z0-9][A-Z0-9\-\.]{2,})/g,
  },

  // Inverter patterns
  inverter: {
    // Brand + model + kW: "SMA 5kW", "Fronius Primo 8.2"
    brandModelKw: /([A-Z][A-Za-z\s]*)\s+([A-Z0-9][A-Z0-9\-\.]{1,})\s*(\d{1,2}(?:\.\d+)?)\s*kw?/gi,
    
    // Just kW rating: "5kW inverter"
    kwRating: /(\d{1,2}(?:\.\d+)?)\s*kw\s*(?:inverter|inv)?/gi,
    
    // Phase info
    phases: /(single\s*phase|three\s*phase|1\s*phase|3\s*phase)/gi,
  },

  // Unit normalization
  units: {
    kwh: /k?wh?/gi,
    kw: /k?w(?!h)/gi,
    watts: /w(?:att)?s?/gi,
  },

  // Context detection
  context: {
    table: /\||\t|(?:\s{3,})/,
    header: /^.{0,50}(?:solar|battery|inverter|system|proposal)/i,
    footer: /(?:page\s*\d+|total|subtotal|©|copyright)/i,
  },
};

// Helper functions for pattern matching
export const extractors = {
  // Extract all battery candidates from text
  extractBatteries: (text: string, page: number, context: string): any[] => {
    const candidates = [];
    
    // Stack patterns
    const stackMatches = [...text.matchAll(patterns.battery.stack)];
    for (const match of stackMatches) {
      const modules = parseInt(match[1]);
      const moduleKWh = parseFloat(match[2]);
      const unit = match[3].toLowerCase();
      
      let totalKWh = modules * moduleKWh;
      if (unit === 'wh') totalKWh = totalKWh / 1000;
      
      candidates.push({
        stack: { modules, moduleKWh, totalKWh },
        usableKWh: totalKWh,
        evidences: [{
          page,
          text: match[0],
          context: context as any,
          weight: context === 'TABLE' ? 5 : 3,
        }],
      });
    }
    
    // Model + capacity patterns
    const modelCapMatches = [...text.matchAll(patterns.battery.modelCapacity)];
    for (const match of modelCapMatches) {
      const model = match[1];
      const capacity = parseFloat(match[2]);
      
      candidates.push({
        model,
        usableKWh: capacity,
        evidences: [{
          page,
          text: match[0],
          context: context as any,
          weight: context === 'TABLE' ? 5 : 4,
        }],
      });
    }
    
    return candidates;
  },
  
  // Extract panel candidates
  extractPanels: (text: string, page: number, context: string): any[] => {
    const candidates = [];
    
    // Count x Watts patterns
    const countWattMatches = [...text.matchAll(patterns.panel.countWatts)];
    for (const match of countWattMatches) {
      const count = parseInt(match[1]);
      const wattage = parseInt(match[2]);
      const arrayKwDc = (count * wattage) / 1000;
      
      candidates.push({
        count,
        wattage,
        arrayKwDc,
        evidences: [{
          page,
          text: match[0],
          context: context as any,
          weight: context === 'TABLE' ? 5 : 4,
        }],
      });
    }
    
    // Array size patterns
    const arraySizeMatches = [...text.matchAll(patterns.panel.arraySize)];
    for (const match of arraySizeMatches) {
      const arrayKwDc = parseFloat(match[1]);
      
      candidates.push({
        arrayKwDc,
        evidences: [{
          page,
          text: match[0],
          context: context as any,
          weight: context === 'TABLE' ? 4 : 3,
        }],
      });
    }
    
    return candidates;
  },
  
  // Extract inverter info (no DB lookup)
  extractInverter: (text: string, page: number, context: string): any => {
    const brandModelMatches = [...text.matchAll(patterns.inverter.brandModelKw)];
    const kwMatches = [...text.matchAll(patterns.inverter.kwRating)];
    const phaseMatches = [...text.matchAll(patterns.inverter.phases)];
    
    let result: any = { evidences: [] };
    
    if (brandModelMatches.length > 0) {
      const match = brandModelMatches[0];
      result.brandRaw = match[1].trim();
      result.modelRaw = match[2].trim();
      result.ratedKw = parseFloat(match[3]);
      result.evidences.push({
        page,
        text: match[0],
        context: context as any,
        weight: context === 'TABLE' ? 5 : 4,
      });
    }
    
    if (kwMatches.length > 0 && !result.ratedKw) {
      const match = kwMatches[0];
      result.ratedKw = parseFloat(match[1]);
      result.evidences.push({
        page,
        text: match[0],
        context: context as any,
        weight: context === 'TABLE' ? 4 : 3,
      });
    }
    
    if (phaseMatches.length > 0) {
      const match = phaseMatches[0];
      result.phases = match[0].includes('3') || match[0].toLowerCase().includes('three') ? 'THREE' : 'SINGLE';
    }
    
    return result.evidences.length > 0 ? result : null;
  },
};