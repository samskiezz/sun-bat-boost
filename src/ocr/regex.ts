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
    console.log('🔍 Battery extraction from text:', text.substring(0, 200));
    
    // Find brand matches first
    const brandMatches = [...text.matchAll(patterns.brands.battery)];
    console.log('🏷️ Found battery brands:', brandMatches.map(m => m[0]));
    
    // Stack patterns with proximity brand matching
    const stackMatches = [...text.matchAll(patterns.battery.stack)];
    for (const match of stackMatches) {
      const modules = parseInt(match[1]);
      const moduleKWh = parseFloat(match[2]);
      const unit = match[3].toLowerCase();
      
      let totalKWh = modules * moduleKWh;
      if (unit === 'wh') totalKWh = totalKWh / 1000;
      
      // Find nearest brand (within 50 chars before or after)
      const matchIndex = match.index || 0;
      const nearbyText = text.substring(Math.max(0, matchIndex - 50), matchIndex + match[0].length + 50);
      const nearbyBrand = [...nearbyText.matchAll(patterns.brands.battery)][0];
      
      candidates.push({
        brand: nearbyBrand ? nearbyBrand[0].trim() : undefined,
        stack: { modules, moduleKWh, totalKWh },
        usableKWh: totalKWh,
        evidences: [{
          page,
          text: match[0],
          context: context as any,
          weight: context === 'TABLE' ? 5 : 3,
        }],
      });
      
      console.log('⚡ Stack battery candidate:', { brand: nearbyBrand?.[0], totalKWh, modules, moduleKWh });
    }
    
    // Model + capacity patterns
    const modelCapMatches = [...text.matchAll(patterns.battery.modelCapacity)];
    for (const match of modelCapMatches) {
      const model = match[1];
      const capacity = parseFloat(match[2]);
      
      // Find brand in nearby text
      const matchIndex = match.index || 0;
      const nearbyText = text.substring(Math.max(0, matchIndex - 30), matchIndex + match[0].length + 30);
      const nearbyBrand = [...nearbyText.matchAll(patterns.brands.battery)][0];
      
      candidates.push({
        brand: nearbyBrand ? nearbyBrand[0].trim() : undefined,
        model,
        usableKWh: capacity,
        evidences: [{
          page,
          text: match[0],
          context: context as any,
          weight: context === 'TABLE' ? 5 : 4,
        }],
      });
      
      console.log('🔋 Model+capacity battery candidate:', { brand: nearbyBrand?.[0], model, capacity });
    }
    
    // Standalone capacity with brand proximity
    const capacityMatches = [...text.matchAll(patterns.battery.capacity)];
    for (const match of capacityMatches) {
      const capacityText = match[1];
      let capacity = parseFloat(capacityText);
      
      // Convert Wh to kWh if needed
      if (capacityText.toLowerCase().includes('wh') && !capacityText.toLowerCase().includes('kwh')) {
        capacity = capacity / 1000;
      }
      
      // Only consider reasonable battery sizes
      if (capacity >= 5 && capacity <= 200) {
        const matchIndex = match.index || 0;
        const nearbyText = text.substring(Math.max(0, matchIndex - 50), matchIndex + match[0].length + 50);
        const nearbyBrand = [...nearbyText.matchAll(patterns.brands.battery)][0];
        
        // Check if "battery" keyword is nearby
        const batteryKeyword = /battery|storage|energy/i.test(nearbyText);
        
        if (nearbyBrand || batteryKeyword) {
          candidates.push({
            brand: nearbyBrand ? nearbyBrand[0].trim() : undefined,
            usableKWh: capacity,
            evidences: [{
              page,
              text: match[0],
              context: context as any,
              weight: (context === 'TABLE' ? 4 : 2) + (nearbyBrand ? 2 : 0),
            }],
          });
          
          console.log('🔋 Capacity-only battery candidate:', { brand: nearbyBrand?.[0], capacity, batteryKeyword });
        }
      }
    }
    
    console.log('🔋 Total battery candidates found:', candidates.length);
    return candidates;
  },
  
  // Extract panel candidates
  extractPanels: (text: string, page: number, context: string): any[] => {
    const candidates = [];
    console.log('🔍 Panel extraction from text:', text.substring(0, 200));
    
    // Find brand matches first
    const brandMatches = [...text.matchAll(patterns.brands.solar)];
    console.log('🏷️ Found panel brands:', brandMatches.map(m => m[0]));
    
    // Count x Watts patterns with brand proximity
    const countWattMatches = [...text.matchAll(patterns.panel.countWatts)];
    for (const match of countWattMatches) {
      const count = parseInt(match[1]);
      const wattage = parseInt(match[2]);
      const arrayKwDc = (count * wattage) / 1000;
      
      // Find nearest brand and model
      const matchIndex = match.index || 0;
      const nearbyText = text.substring(Math.max(0, matchIndex - 80), matchIndex + match[0].length + 80);
      const nearbyBrand = [...nearbyText.matchAll(patterns.brands.solar)][0];
      const nearbyModel = [...nearbyText.matchAll(patterns.panel.model)].find(m => m[0].length >= 3);
      
      candidates.push({
        brand: nearbyBrand ? nearbyBrand[0].trim() : undefined,
        model: nearbyModel ? nearbyModel[0].trim() : undefined,
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
      
      console.log('⚡ Count×Watts panel candidate:', { brand: nearbyBrand?.[0], model: nearbyModel?.[0], count, wattage, arrayKwDc });
    }
    
    // Array size patterns with brand proximity
    const arraySizeMatches = [...text.matchAll(patterns.panel.arraySize)];
    for (const match of arraySizeMatches) {
      const arrayKwDc = parseFloat(match[1]);
      
      // Only consider reasonable array sizes
      if (arrayKwDc >= 1 && arrayKwDc <= 100) {
        const matchIndex = match.index || 0;
        const nearbyText = text.substring(Math.max(0, matchIndex - 80), matchIndex + match[0].length + 80);
        const nearbyBrand = [...nearbyText.matchAll(patterns.brands.solar)][0];
        const nearbyModel = [...nearbyText.matchAll(patterns.panel.model)].find(m => m[0].length >= 3);
        
        // Check for solar/panel keywords nearby
        const solarKeyword = /solar|panel|pv|array/i.test(nearbyText);
        
        if (nearbyBrand || solarKeyword) {
          candidates.push({
            brand: nearbyBrand ? nearbyBrand[0].trim() : undefined,
            model: nearbyModel ? nearbyModel[0].trim() : undefined,
            arrayKwDc,
            evidences: [{
              page,
              text: match[0],
              context: context as any,
              weight: (context === 'TABLE' ? 4 : 3) + (nearbyBrand ? 1 : 0),
            }],
          });
          
          console.log('⚡ Array size panel candidate:', { brand: nearbyBrand?.[0], model: nearbyModel?.[0], arrayKwDc, solarKeyword });
        }
      }
    }
    
    console.log('⚡ Total panel candidates found:', candidates.length);
    return candidates;
  },
  
  // Extract inverter info (no DB lookup)
  extractInverter: (text: string, page: number, context: string): any => {
    console.log('🔍 Inverter extraction from text:', text.substring(0, 200));
    
    const brandModelMatches = [...text.matchAll(patterns.inverter.brandModelKw)];
    const kwMatches = [...text.matchAll(patterns.inverter.kwRating)];
    const phaseMatches = [...text.matchAll(patterns.inverter.phases)];
    const inverterBrandMatches = [...text.matchAll(patterns.brands.inverter)];
    
    console.log('🏷️ Found inverter brands:', inverterBrandMatches.map(m => m[0]));
    console.log('⚡ Found kW ratings:', kwMatches.map(m => m[1]));
    
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
      console.log('🔌 Brand+Model+kW match:', { brand: result.brandRaw, model: result.modelRaw, kw: result.ratedKw });
    }
    
    // If no complete match, try to combine brand + kW rating
    if (!result.brandRaw && inverterBrandMatches.length > 0 && kwMatches.length > 0) {
      const brand = inverterBrandMatches[0];
      const kwMatch = kwMatches[0];
      
      // Check if they're reasonably close (within 100 chars)
      const brandIndex = brand.index || 0;
      const kwIndex = kwMatch.index || 0;
      
      if (Math.abs(brandIndex - kwIndex) < 100) {
        result.brandRaw = brand[0].trim();
        result.ratedKw = parseFloat(kwMatch[1]);
        result.evidences.push({
          page,
          text: `${brand[0]} ... ${kwMatch[0]}`,
          context: context as any,
          weight: context === 'TABLE' ? 4 : 3,
        });
        console.log('🔌 Separate brand+kW match:', { brand: result.brandRaw, kw: result.ratedKw });
      }
    }
    
    if (kwMatches.length > 0 && !result.ratedKw) {
      const match = kwMatches[0];
      const kw = parseFloat(match[1]);
      
      // Only consider reasonable inverter sizes and check for inverter keyword nearby
      if (kw >= 1 && kw <= 50) {
        const matchIndex = match.index || 0;
        const nearbyText = text.substring(Math.max(0, matchIndex - 50), matchIndex + match[0].length + 50);
        const inverterKeyword = /inverter|inv/i.test(nearbyText);
        
        if (inverterKeyword) {
          result.ratedKw = kw;
          result.evidences.push({
            page,
            text: match[0],
            context: context as any,
            weight: context === 'TABLE' ? 3 : 2,
          });
          console.log('🔌 kW-only inverter match:', { kw, inverterKeyword });
        }
      }
    }
    
    if (phaseMatches.length > 0) {
      const match = phaseMatches[0];
      result.phases = match[0].includes('3') || match[0].toLowerCase().includes('three') ? 'THREE' : 'SINGLE';
    }
    
    console.log('🔌 Inverter extraction result:', result.evidences.length > 0 ? result : 'none');
    return result.evidences.length > 0 ? result : null;
  },
};