// Regex patterns for OCR extraction

export const patterns = {
  // Brand patterns - more specific to avoid OCR noise
  brands: {
    // Panel brands - only match when near panel context
    solar: /(?:jinko(?:solar)?|trina|longi|canadian\s+solar|ja\s+solar|rec|aiko|qcells|lg|panasonic|sunpower|tier\s*1|monocrystalline|polycrystalline)/gi,
    // Battery brands - only specific battery manufacturers
    battery: /(?:sigenergy|sigen|tesla|powerwall|alpha\s*ess|sonnen|byd|pylontech|enphase|lg\s*chem|samsung|bmz)/gi,
    // Inverter brands - avoid confusion with other components
    inverter: /(?:sma|fronius|solar\s*edge|growatt|sungrow|huawei|goodwe|abb|schneider\s*electric|delta|kostal|victron)/gi,
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
    // Count x Watts: "24 x 440W", "18×415 watts" - more specific
    countWatts: /(\d{1,2})\s*(?:x|×)\s*(\d{3,4})\s*w(?:att)?s?(?:\s+(?:panel|module|solar))?/gi,
    
    // Array size: "10.56 kW DC", "7.2kW array" - avoid picking up random kW
    arraySize: /(\d{1,2}(?:\.\d+)?)\s*kw\s*(?:dc|array|system|solar)/gi,
    
    // Model patterns: more restrictive to avoid OCR noise
    model: /\b([A-Z][A-Z0-9]{1,}(?:[-\.][A-Z0-9]+)*)\b/g,
    
    // Brand + model + watts: "Jinko JKM440M 440W"
    brandModelWatts: /(jinko|trina|longi|canadian|ja\s+solar|rec|aiko|qcells|lg|panasonic)\s+([A-Z0-9][\w\-\.]+)\s+(\d{3,4})w/gi,
  },

  // Inverter patterns - much more specific
  inverter: {
    // Brand + model + kW: "SMA Sunny Boy 5kW", "Fronius Primo 8.2kW"
    brandModelKw: /(sma|fronius|solar\s*edge|growatt|sungrow|huawei|goodwe|abb|schneider)\s+([\w\-\s]+?)\s+(\d{1,2}(?:\.\d+)?)\s*kw\s*(?:inverter)?/gi,
    
    // Just kW rating with inverter context: "5kW inverter"
    kwRating: /(\d{1,2}(?:\.\d+)?)\s*kw\s+(?:inverter|string\s+inverter|micro\s+inverter)/gi,
    
    // Phase info
    phases: /(single\s*phase|three\s*phase|1\s*phase|3\s*phase)/gi,
  },

  // Unit normalization
  units: {
    kwh: /k?wh?/gi,
    kw: /k?w(?!h)/gi,
    watts: /w(?:att)?s?/gi,
  },

  // Context detection - more specific
  context: {
    table: /\||\t|(?:\s{3,})/,
    header: /^.{0,100}(?:proposal|quote|system|solar|energy|for|prepared\s+by)/i,
    footer: /(?:page\s*\d+|total|subtotal|©|copyright|phone|email|\.com|\.au)/i,
    noise: /(?:^proposal\s+for|^prepared\s+by|^quote\s*#|^valid\s+until|@\w+\.com|^\d{4}\s+\d{3}\s+\d{3})/i,
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
    
    // Skip header/footer noise
    if (context === 'HEADER' || context === 'FOOTER' || patterns.context.noise.test(text)) {
      console.log('⏭️ Skipping panel extraction from noise/header/footer');
      return [];
    }
    
    // Brand + Model + Watts patterns (most reliable)
    const brandModelWattMatches = [...text.matchAll(patterns.panel.brandModelWatts)];
    for (const match of brandModelWattMatches) {
      const brand = match[1].trim();
      const model = match[2].trim();
      const wattage = parseInt(match[3]);
      
      candidates.push({
        brand,
        model,
        wattage,
        evidences: [{
          page,
          text: match[0],
          context: context as any,
          weight: context === 'TABLE' ? 6 : 5,
        }],
      });
      
      console.log('⚡ Brand+Model+Watts panel candidate:', { brand, model, wattage });
    }
    
    // Count x Watts patterns with strict brand matching
    const countWattMatches = [...text.matchAll(patterns.panel.countWatts)];
    for (const match of countWattMatches) {
      const count = parseInt(match[1]);
      const wattage = parseInt(match[2]);
      const arrayKwDc = (count * wattage) / 1000;
      
      // Only consider reasonable counts and wattages
      if (count < 1 || count > 100 || wattage < 250 || wattage > 700) continue;
      
      // Find nearest brand within reasonable distance
      const matchIndex = match.index || 0;
      const nearbyText = text.substring(Math.max(0, matchIndex - 100), matchIndex + match[0].length + 100);
      const nearbyBrand = [...nearbyText.matchAll(patterns.brands.solar)][0];
      
      // Must have solar context or brand nearby
      const solarContext = /solar|panel|pv|module|array/i.test(nearbyText);
      
      if (nearbyBrand || solarContext) {
        candidates.push({
          brand: nearbyBrand ? nearbyBrand[0].trim() : undefined,
          count,
          wattage,
          arrayKwDc,
          evidences: [{
            page,
            text: match[0],
            context: context as any,
            weight: (context === 'TABLE' ? 5 : 4) + (nearbyBrand ? 1 : 0),
          }],
        });
        
        console.log('⚡ Count×Watts panel candidate:', { brand: nearbyBrand?.[0], count, wattage, arrayKwDc });
      }
    }
    
    // Array size only as fallback
    const arraySizeMatches = [...text.matchAll(patterns.panel.arraySize)];
    for (const match of arraySizeMatches) {
      const arrayKwDc = parseFloat(match[1]);
      
      // Only reasonable array sizes
      if (arrayKwDc < 1 || arrayKwDc > 100) continue;
      
      const matchIndex = match.index || 0;
      const nearbyText = text.substring(Math.max(0, matchIndex - 100), matchIndex + match[0].length + 100);
      const nearbyBrand = [...nearbyText.matchAll(patterns.brands.solar)][0];
      
      // Must have strong solar context
      const strongSolarContext = /(?:solar|pv)\s*(?:array|system|installation)/i.test(nearbyText);
      
      if (strongSolarContext && nearbyBrand) {
        candidates.push({
          brand: nearbyBrand[0].trim(),
          arrayKwDc,
          evidences: [{
            page,
            text: match[0],
            context: context as any,
            weight: context === 'TABLE' ? 3 : 2,
          }],
        });
        
        console.log('⚡ Array size panel candidate:', { brand: nearbyBrand[0], arrayKwDc });
      }
    }
    
    console.log('⚡ Total panel candidates found:', candidates.length);
    return candidates;
  },
  
  // Extract inverter info (no DB lookup)
  extractInverter: (text: string, page: number, context: string): any => {
    console.log('🔍 Inverter extraction from text:', text.substring(0, 200));
    
    // Skip headers/footers/noise that often contain false inverter mentions
    if (context === 'HEADER' || context === 'FOOTER' || patterns.context.noise.test(text)) {
      console.log('⏭️ Skipping inverter extraction from noise/header/footer');
      return null;
    }
    
    const brandModelMatches = [...text.matchAll(patterns.inverter.brandModelKw)];
    const kwMatches = [...text.matchAll(patterns.inverter.kwRating)];
    const phaseMatches = [...text.matchAll(patterns.inverter.phases)];
    const inverterBrandMatches = [...text.matchAll(patterns.brands.inverter)];
    
    console.log('🏷️ Found inverter brands:', inverterBrandMatches.map(m => m[0]));
    console.log('⚡ Found kW ratings:', kwMatches.map(m => m[1]));
    
    let result: any = { evidences: [] };
    
    // Brand + Model + kW (most reliable)
    if (brandModelMatches.length > 0) {
      const match = brandModelMatches[0];
      const brandRaw = match[1].trim();
      const modelRaw = match[2].trim();
      const ratedKw = parseFloat(match[3]);
      
      // Validate it's not OCR noise
      if (brandRaw.length > 2 && modelRaw.length > 2 && ratedKw >= 1 && ratedKw <= 50) {
        result.brandRaw = brandRaw;
        result.modelRaw = modelRaw;
        result.ratedKw = ratedKw;
        result.evidences.push({
          page,
          text: match[0],
          context: context as any,
          weight: context === 'TABLE' ? 6 : 5,
        });
        console.log('🔌 Brand+Model+kW match:', { brand: result.brandRaw, model: result.modelRaw, kw: result.ratedKw });
      }
    }
    
    // Brand + kW rating (separate matches)
    if (!result.brandRaw && inverterBrandMatches.length > 0 && kwMatches.length > 0) {
      const brand = inverterBrandMatches[0];
      const kwMatch = kwMatches[0];
      const kw = parseFloat(kwMatch[1]);
      
      // Check proximity and validate values
      const brandIndex = brand.index || 0;
      const kwIndex = kwMatch.index || 0;
      
      if (Math.abs(brandIndex - kwIndex) < 80 && kw >= 1 && kw <= 50) {
        // Ensure inverter context
        const combinedText = text.substring(
          Math.min(brandIndex, kwIndex) - 20, 
          Math.max(brandIndex + brand[0].length, kwIndex + kwMatch[0].length) + 20
        );
        const hasInverterContext = /inverter|string|micro/i.test(combinedText);
        
        if (hasInverterContext) {
          result.brandRaw = brand[0].trim();
          result.ratedKw = kw;
          result.evidences.push({
            page,
            text: `${brand[0]} ... ${kwMatch[0]}`,
            context: context as any,
            weight: context === 'TABLE' ? 4 : 3,
          });
          console.log('🔌 Separate brand+kW match:', { brand: result.brandRaw, kw: result.ratedKw });
        }
      }
    }
    
    // kW with inverter keyword (fallback)
    if (!result.ratedKw && kwMatches.length > 0) {
      const match = kwMatches[0];
      const kw = parseFloat(match[1]);
      
      if (kw >= 1 && kw <= 50) {
        result.ratedKw = kw;
        result.evidences.push({
          page,
          text: match[0],
          context: context as any,
          weight: context === 'TABLE' ? 3 : 2,
        });
        console.log('🔌 kW-only inverter match:', { kw });
      }
    }
    
    // Phase detection
    if (phaseMatches.length > 0) {
      const match = phaseMatches[0];
      result.phases = match[0].includes('3') || match[0].toLowerCase().includes('three') ? 'THREE' : 'SINGLE';
    }
    
    console.log('🔌 Inverter extraction result:', result.evidences.length > 0 ? result : 'none');
    return result.evidences.length > 0 ? result : null;
  },
};