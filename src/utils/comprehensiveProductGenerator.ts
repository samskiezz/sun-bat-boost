// Comprehensive Product Generator - Creates patterns for ALL database products
import { supabase } from "@/integrations/supabase/client";
import { SOLAR_PANELS, PanelSpec } from "@/data/panelData";
import { BATTERY_SYSTEMS, BatterySpec } from "@/data/batteryData";
import { Product, ProdType } from "./smartMatcher";

// Ultra-precise regex generator for each brand/model combination
function generateSmartRegex(brand: string, model: string, type: ProdType, specs?: any): string {
  const brandNorm = brand.toUpperCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const modelNorm = model.toUpperCase().trim();
  
  // Extract key identifying features
  const wattage = specs?.power_rating || specs?.rating || extractWattage(modelNorm);
  const capacity = specs?.capacity_kwh || specs?.capacity || extractCapacity(modelNorm);
  const kwRating = specs?.kw_rating || extractKwRating(modelNorm);
  
  // Brand-specific ultra-precise patterns
  switch (brand.toUpperCase()) {
    case "JINKO":
    case "JINKO SOLAR":
      return generateJinkoPattern(modelNorm, wattage);
      
    case "TRINA":
    case "TRINA SOLAR":
      return generateTrinaPattern(modelNorm, wattage);
      
    case "LONGI":
    case "LONGI SOLAR":
      return generateLongiPattern(modelNorm, wattage);
      
    case "JA SOLAR":
    case "JA":
      return generateJaSolarPattern(modelNorm, wattage);
      
    case "QCELLS":
    case "HANWHA Q CELLS":
      return generateQcellsPattern(modelNorm, wattage);
      
    case "CANADIAN SOLAR":
    case "CANADIAN":
      return generateCanadianPattern(modelNorm, wattage);
      
    case "REC":
      return generateRecPattern(modelNorm, wattage);
      
    case "GOODWE":
      return generateGoodwePattern(modelNorm, type, kwRating, capacity);
      
    case "SUNGROW":
      return generateSungrowPattern(modelNorm, type, kwRating, capacity);
      
    case "SOLAREDGE":
      return generateSolarEdgePattern(modelNorm, type, kwRating, capacity);
      
    case "FRONIUS":
      return generateFroniusPattern(modelNorm, kwRating);
      
    case "SMA":
      return generateSMAPattern(modelNorm, kwRating);
      
    case "TESLA":
      return generateTeslaPattern(modelNorm, capacity);
      
    case "BYD":
      return generateBYDPattern(modelNorm, capacity);
      
    case "PYLONTECH":
      return generatePylontechPattern(modelNorm, capacity);
      
    case "ALPHAESS":
      return generateAlphaESSPattern(modelNorm, capacity);
      
    case "ENPHASE":
      return generateEnphasePattern(modelNorm, type, kwRating, capacity);
      
    default:
      return generateGenericPattern(brandNorm, modelNorm, type, wattage, kwRating, capacity);
  }
}

// Helper functions to extract specs from model names
function extractWattage(model: string): number | undefined {
  const match = model.match(/(\d{3,4})W?(?:\b|$)/);
  return match ? parseInt(match[1]) : undefined;
}

function extractCapacity(model: string): number | undefined {
  const match = model.match(/(\d{1,2}(?:\.\d)?)\s*KWH?/i);
  return match ? parseFloat(match[1]) : undefined;
}

function extractKwRating(model: string): number | undefined {
  const match = model.match(/(\d{1,2}(?:\.\d)?)\s*KW?(?:\b|$)/i);
  return match ? parseFloat(match[1]) : undefined;
}

// Brand-specific pattern generators
function generateJinkoPattern(model: string, wattage?: number): string {
  // JKM440N-54HL4R-V, JKM580N-72HL4-V
  const cellPattern = model.match(/(54|60|66|72)/)?.[1];
  const familyPattern = model.match(/HL\d[A-Z]*/)?.[0];
  const watts = wattage || extractWattage(model);
  
  if (watts && cellPattern && familyPattern) {
    return `\\bJKM${watts}N?[-\\s]?${cellPattern}${familyPattern}[-\\s]?[A-Z]?\\b`;
  }
  return generateStrictModelPattern("JINKO", model);
}

function generateTrinaPattern(model: string, wattage?: number): string {
  // TSM-440NEG9R.28, TSM-415DE09R
  const watts = wattage || extractWattage(model);
  const codePattern = model.match(/[A-Z]{2,3}\d?[A-Z]?(?:\.\d{2})?/)?.[0];
  
  if (watts && codePattern) {
    return `\\bTSM[-\\s]?${watts}${codePattern}\\b`;
  }
  return generateStrictModelPattern("TRINA", model);
}

function generateLongiPattern(model: string, wattage?: number): string {
  // LR5-54HPH-440M, LR5-72HPH-580M
  const seriesPattern = model.match(/LR\d/)?.[0];
  const cellPattern = model.match(/(54|60|66|72)/)?.[1];
  const familyPattern = model.match(/[A-Z]{3,4}/)?.[0];
  const watts = wattage || extractWattage(model);
  
  if (seriesPattern && cellPattern && familyPattern && watts) {
    return `\\b${seriesPattern}[-\\s]?${cellPattern}${familyPattern}[-\\s]?${watts}[A-Z]?\\b`;
  }
  return generateStrictModelPattern("LONGI", model);
}

function generateJaSolarPattern(model: string, wattage?: number): string {
  // JAM54S30-440/MR, JAM72S30-580/MR
  const cellPattern = model.match(/(54|60|66|72)/)?.[1];
  const seriesPattern = model.match(/S\d{2}/)?.[0];
  const watts = wattage || extractWattage(model);
  
  if (cellPattern && seriesPattern && watts) {
    return `\\bJAM${cellPattern}${seriesPattern}[-\\s\\/]?${watts}(?:\\/[A-Z]{2})?\\b`;
  }
  return generateStrictModelPattern("JA SOLAR", model);
}

function generateQcellsPattern(model: string, wattage?: number): string {
  // Q.PEAK DUO BLK ML-G10+ 440, Q.MAXX-G10+ 440
  const seriesPattern = model.match(/Q\.[A-Z]+/)?.[0];
  const familyPattern = model.match(/(DUO|BLK|ML-G10\+|G10\+)/)?.[0];
  const watts = wattage || extractWattage(model);
  
  if (seriesPattern && watts) {
    return `\\b${seriesPattern.replace('.', '\\.')}(?:\\s+${familyPattern})?.*?${watts}\\b`;
  }
  return generateStrictModelPattern("QCELLS", model);
}

function generateCanadianPattern(model: string, wattage?: number): string {
  // CS6R-410MS, CS7N-610MS
  const seriesPattern = model.match(/CS\d[A-Z]/)?.[0];
  const watts = wattage || extractWattage(model);
  const suffixPattern = model.match(/[A-Z]{2}$/)?.[0];
  
  if (seriesPattern && watts && suffixPattern) {
    return `\\b${seriesPattern}[-\\s]?${watts}${suffixPattern}\\b`;
  }
  return generateStrictModelPattern("CANADIAN SOLAR", model);
}

function generateRecPattern(model: string, wattage?: number): string {
  // REC440AA-Pro, REC Alpha Pure-R 430
  const seriesPattern = model.match(/(Alpha|TwinPeak|N-Peak)/i)?.[0];
  const watts = wattage || extractWattage(model);
  
  if (watts) {
    return seriesPattern 
      ? `\\bREC\\s+${seriesPattern}.*?${watts}\\b`
      : `\\bREC${watts}[A-Z]{2}(?:[-\\s]?[A-Z]+)?\\b`;
  }
  return generateStrictModelPattern("REC", model);
}

function generateGoodwePattern(model: string, type: ProdType, kwRating?: number, capacity?: number): string {
  if (type === "inverter") {
    // GW6000-EH, GW10K-ET
    const kwMatch = model.match(/(\d{4,5}K?)/)?.[1];
    const familyMatch = model.match(/[A-Z]{2,3}$/)?.[0];
    if (kwMatch && familyMatch) {
      return `\\bGW${kwMatch}[-\\s]?${familyMatch}\\b`;
    }
  } else if (type === "battery") {
    // LX F12.8-H-20, LYNX F12.8-H-20
    const capacityMatch = capacity || extractCapacity(model);
    const modelPattern = model.match(/(LX|LYNX)[-\\s]?F(\d{1,2}\.\d)[-\\s]?H[-\\s]?\d{2}/);
    if (modelPattern && capacityMatch) {
      return `\\b(?:LX|LYNX)[-\\s]?F[-\\s]?${modelPattern[2]}[-\\s]?H[-\\s]?\\d{2}\\b`;
    }
  }
  return generateStrictModelPattern("GOODWE", model);
}

function generateSungrowPattern(model: string, type: ProdType, kwRating?: number, capacity?: number): string {
  if (type === "inverter") {
    // SG10RS, SG5K-D, SH10.0RT
    const kwMatch = model.match(/(\d{1,2}(?:\.\d)?K?)/)?.[1];
    const typeMatch = model.match(/^S[GH]/)?.[0];
    const suffixMatch = model.match(/[A-Z]{1,3}$/)?.[0];
    if (typeMatch && kwMatch) {
      return `\\b${typeMatch}${kwMatch}${suffixMatch || '[A-Z]*'}\\b`;
    }
  } else if (type === "battery") {
    // SBR096, SBR128
    const capacityCode = model.match(/SBR(\d{3})/)?.[1];
    if (capacityCode) {
      return `\\bSBR${capacityCode}\\b`;
    }
  }
  return generateStrictModelPattern("SUNGROW", model);
}

function generateSolarEdgePattern(model: string, type: ProdType, kwRating?: number, capacity?: number): string {
  if (type === "inverter") {
    // SE5000H, SE7000, SE10K
    const kwMatch = model.match(/(\d{4,5}K?)/)?.[1];
    const suffixMatch = model.match(/[A-Z]$/)?.[0];
    if (kwMatch) {
      return `\\bSE${kwMatch}${suffixMatch || '[A-Z]?'}\\b`;
    }
  } else if (type === "battery") {
    // Energy Bank 10kWh
    const capacityMatch = capacity || extractCapacity(model);
    if (capacityMatch) {
      return `\\b(?:SOLAREDGE\\s+)?(?:Energy\\s+Bank|Battery)\\s+${capacityMatch}\\s*kWh\\b`;
    }
  }
  return generateStrictModelPattern("SOLAREDGE", model);
}

function generateFroniusPattern(model: string, kwRating?: number): string {
  // PRIMO 5.0-1, SYMO 10.0-3-M
  const seriesMatch = model.match(/(PRIMO|SYMO|SNAP)/)?.[1];
  const kwMatch = model.match(/(\d{1,2}(?:\.\d)?)/)?.[1];
  const phaseMatch = model.match(/[-\\s]([13])/)?.[1];
  
  if (seriesMatch && kwMatch) {
    return `\\b${seriesMatch}\\s+${kwMatch}(?:[-\\s]?${phaseMatch || '[13]'})?(?:[-\\s]?[A-Z])?\\b`;
  }
  return generateStrictModelPattern("FRONIUS", model);
}

function generateSMAPattern(model: string, kwRating?: number): string {
  // SB3.0-1AV-41, SB5.0-1SP-US-41
  const kwMatch = model.match(/(\d{1,2}(?:\.\d)?)/)?.[1];
  const suffixMatch = model.match(/[-\\s](.+)$/)?.[1];
  
  if (kwMatch) {
    return `\\bSB\\s?${kwMatch}(?:[-\\s]?${suffixMatch?.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") || '[A-Z0-9-]+'})?\\b`;
  }
  return generateStrictModelPattern("SMA", model);
}

function generateTeslaPattern(model: string, capacity?: number): string {
  // Powerwall 2, Powerwall 3
  const versionMatch = model.match(/(\d)/)?.[1];
  if (versionMatch) {
    return `\\b(?:TESLA\\s+)?POWERWALL\\s+${versionMatch}\\b`;
  }
  return `\\b(?:TESLA\\s+)?POWERWALL(?:\\s+\\d)?\\b`;
}

function generateBYDPattern(model: string, capacity?: number): string {
  // Battery-Box Premium HVM 16.6, HVS 10.2
  const seriesMatch = model.match(/(HVM|HVS)/)?.[1];
  const capacityMatch = capacity || extractCapacity(model);
  
  if (seriesMatch && capacityMatch) {
    return `\\b(?:BYD\\s+)?(?:Battery[-\\s]?Box\\s+Premium\\s+)?${seriesMatch}\\s+${capacityMatch}\\b`;
  }
  return generateStrictModelPattern("BYD", model);
}

function generatePylontechPattern(model: string, capacity?: number): string {
  // US5000, US3000C, UP5000
  const seriesMatch = model.match(/(US|UP)(\d{4}[A-Z]?)/)?.[0];
  if (seriesMatch) {
    return `\\b${seriesMatch}\\b`;
  }
  return generateStrictModelPattern("PYLONTECH", model);
}

function generateAlphaESSPattern(model: string, capacity?: number): string {
  // SMILE-B3+, SMILE5, STORION-T30
  const seriesMatch = model.match(/(SMILE|STORION)/)?.[1];
  const modelCode = model.match(/[-\\s]?([A-Z0-9+]+)/)?.[1];
  
  if (seriesMatch) {
    return `\\b${seriesMatch}(?:[-\\s]?${modelCode?.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") || '[A-Z0-9+-]+'})?\\b`;
  }
  return generateStrictModelPattern("ALPHAESS", model);
}

function generateEnphasePattern(model: string, type: ProdType, kwRating?: number, capacity?: number): string {
  if (type === "inverter") {
    // IQ7A, IQ8M, IQ8+
    const seriesMatch = model.match(/(IQ\d[A-Z+]*)/)?.[1];
    if (seriesMatch) {
      return `\\b${seriesMatch}\\b`;
    }
  } else if (type === "battery") {
    // IQ Battery 10T, IQ Battery 5P
    const capacityCode = model.match(/(\d{1,2}[A-Z])/)?.[1];
    if (capacityCode) {
      return `\\bIQ\\s+Battery\\s+${capacityCode}\\b`;
    }
  }
  return generateStrictModelPattern("ENPHASE", model);
}

// Generic pattern for unlisted brands
function generateGenericPattern(brand: string, model: string, type: ProdType, wattage?: number, kwRating?: number, capacity?: number): string {
  const specs = [wattage && `${wattage}W?`, kwRating && `${kwRating}kW?`, capacity && `${capacity}kWh?`]
    .filter(Boolean).join('|');
  
  const modelEscaped = model.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\s+/g, "[-\\s]?")
    .replace(/[-]/g, "[-\\s]?");
  
  return specs 
    ? `\\b${brand}[-\\s]?${modelEscaped}(?:[-\\s]?(?:${specs}))?\\b`
    : `\\b${brand}[-\\s]?${modelEscaped}\\b`;
}

// Strict model pattern as fallback
function generateStrictModelPattern(brand: string, model: string): string {
  const tokens = model.split(/[\s\-\/]+/).filter(Boolean);
  const escapedTokens = tokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return `\\b${brand}[-\\s]?${escapedTokens.join("[-\\s\\/]?")}\\b`;
}

// Generate aliases for OCR variations
function generateAliases(brand: string, model: string): string[] {
  const aliases = new Set<string>();
  
  // Original
  aliases.add(`${brand} ${model}`.toUpperCase());
  
  // Common OCR confusions
  const ocrSwaps: [string, string][] = [
    ['O', '0'], ['0', 'O'],
    ['I', '1'], ['1', 'I'],
    ['S', '5'], ['5', 'S'],
    ['B', '8'], ['8', 'B'],
    ['G', '6'], ['6', 'G'],
    ['Z', '2'], ['2', 'Z']
  ];
  
  // Apply OCR swaps
  for (const [from, to] of ocrSwaps) {
    const swapped = model.replace(new RegExp(from, 'gi'), to);
    if (swapped !== model) {
      aliases.add(`${brand} ${swapped}`.toUpperCase());
    }
  }
  
  // Spacing variations
  aliases.add(model.replace(/[-\s]/g, '').toUpperCase()); // No spaces/dashes
  aliases.add(model.replace(/[-]/g, ' ').toUpperCase()); // Dashes to spaces
  aliases.add(model.replace(/\s/g, '-').toUpperCase()); // Spaces to dashes
  
  return Array.from(aliases);
}

// Load products from Supabase database
async function loadSupabaseProducts(): Promise<Product[]> {
  const products: Product[] = [];
  
  try {
    // Load panels from pv_modules
    const { data: panels } = await supabase
      .from('pv_modules')
      .select('*')
      .eq('approval_status', 'approved');
      
    if (panels) {
      for (const panel of panels) {
        const specs = { 
          power_rating: panel.power_rating,
          rating: panel.power_rating,
          technology: panel.technology,
          description: panel.description
        };
        products.push({
          id: `supabase-panel-${panel.id}`,
          type: "panel",
          brand: panel.brand.toUpperCase(),
          model: panel.model,
          regex: generateSmartRegex(panel.brand, panel.model, "panel", specs),
          aliases: generateAliases(panel.brand, panel.model),
          specs,
          power_rating: panel.power_rating || undefined
        });
      }
    }
    
    // Load batteries
    const { data: batteries } = await supabase
      .from('batteries')
      .select('*')
      .eq('approval_status', 'approved');
      
    if (batteries) {
      for (const battery of batteries) {
        const specs = {
          capacity_kwh: battery.capacity_kwh,
          capacity: battery.capacity_kwh,
          nominal_capacity: battery.nominal_capacity,
          usable_capacity: battery.usable_capacity,
          chemistry: battery.chemistry,
          units: battery.units
        };
        products.push({
          id: `supabase-battery-${battery.id}`,
          type: "battery",
          brand: battery.brand.toUpperCase(),
          model: battery.model,
          regex: generateSmartRegex(battery.brand, battery.model, "battery", specs),
          aliases: generateAliases(battery.brand, battery.model),
          specs,
          capacity_kwh: battery.capacity_kwh || undefined
        });
      }
    }
    
    // Load all products table for inverters and other types
    const { data: allProducts } = await supabase
      .from('all_products')
      .select('*')
      .eq('approval_status', 'approved')
      .in('product_type', ['inverter', 'panel', 'battery']);
      
    if (allProducts) {
      for (const product of allProducts) {
        const type = product.product_type as ProdType;
        const specs = {
          ...(product.specs ? JSON.parse(product.specs) : {}),
          rating: product.rating,
          capacity: product.capacity,
          power_rating: product.rating,
          capacity_kwh: product.capacity,
          kw_rating: product.rating,
          description: product.description
        };
        products.push({
          id: `supabase-all-${product.id}`,
          type,
          brand: product.brand.toUpperCase(),
          model: product.model,
          regex: generateSmartRegex(product.brand, product.model, type, specs),
          aliases: generateAliases(product.brand, product.model),
          specs,
          power_rating: product.rating || undefined,
          capacity_kwh: product.capacity || undefined
        });
      }
    }
    
  } catch (error) {
    console.warn('Failed to load Supabase products:', error);
  }
  
  return products;
}

// Load products from local data files
function loadLocalProducts(): Product[] {
  const products: Product[] = [];
  
  // Add panels from panelData.ts
  Object.values(SOLAR_PANELS).forEach((panel: PanelSpec) => {
    const specs = { 
      power_rating: panel.power_watts,
      rating: panel.power_watts,
      efficiency: panel.efficiency
    };
    products.push({
      id: `local-panel-${panel.id}`,
      type: "panel",
      brand: panel.brand.toUpperCase(),
      model: panel.model,
      regex: generateSmartRegex(panel.brand, panel.model, "panel", specs),
      aliases: [...panel.common_names.map(name => name.toUpperCase()), 
                ...generateAliases(panel.brand, panel.model)],
      specs,
      power_rating: panel.power_watts
    });
  });
  
  // Add batteries from batteryData.ts
  Object.values(BATTERY_SYSTEMS).forEach((battery: BatterySpec) => {
    const specs = {
      capacity_kwh: battery.capacity_kwh,
      capacity: battery.capacity_kwh,
      chemistry: battery.chemistry,
      warranty_years: battery.warranty_years
    };
    products.push({
      id: `local-battery-${battery.id}`,
      type: "battery",
      brand: battery.brand.toUpperCase(),
      model: battery.model,
      regex: generateSmartRegex(battery.brand, battery.model, "battery", specs),
      aliases: [...battery.common_names.map(name => name.toUpperCase()),
                ...generateAliases(battery.brand, battery.model)],
      specs,
      capacity_kwh: battery.capacity_kwh
    });
  });
  
  return products;
}

// Generate comprehensive products from all sources
export async function generateComprehensiveProducts(): Promise<Product[]> {
  console.log('🔄 Generating comprehensive product database...');
  
  const [supabaseProducts, localProducts] = await Promise.all([
    loadSupabaseProducts(),
    loadLocalProducts()
  ]);
  
  // Combine and deduplicate by brand+model
  const productMap = new Map<string, Product>();
  
  [...localProducts, ...supabaseProducts].forEach(product => {
    const key = `${product.brand}-${product.model}`.toLowerCase();
    if (!productMap.has(key)) {
      productMap.set(key, product);
    }
  });
  
  const products = Array.from(productMap.values());
  
  console.log(`✅ Generated ${products.length} products from all sources:`, {
    panels: products.filter(p => p.type === 'panel').length,
    batteries: products.filter(p => p.type === 'battery').length,
    inverters: products.filter(p => p.type === 'inverter').length,
    brands: new Set(products.map(p => p.brand)).size
  });
  
  return products;
}

// Export comprehensive brand regex patterns for all known brands
export const BRAND_PATTERNS = {
  // Panel brands
  JINKO: {
    panel: /\bJKM\d{3,4}N?[-\s]?(54|60|66|72)[A-Z]{2,6}[-\s]?[A-Z]?\b/gi
  },
  TRINA: {
    panel: /\bTSM[-\s]?\d{3,4}[A-Z]{2,3}\d?[A-Z]?(?:\.\d{2})?\b/gi
  },
  LONGI: {
    panel: /\bLR\d[-\s]?(54|60|66|72)[A-Z]{3,4}[-\s]?\d{3,4}[A-Z]?\b/gi
  },
  "JA SOLAR": {
    panel: /\bJAM(54|60|66|72)[A-Z0-9]+[-\s\\/]?\d{3,4}(?:\/[A-Z]{2})?\b/gi
  },
  QCELLS: {
    panel: /\bQ\.[A-Z]+(?:\s+[A-Z]+)*\s+\d{3,4}\b/gi
  },
  "CANADIAN SOLAR": {
    panel: /\bCS\d[A-Z][-\s]?\d{3,4}[A-Z]{2}\b/gi
  },
  REC: {
    panel: /\bREC(?:\s+[A-Z]+)*\s*\d{3,4}[A-Z]{2}(?:[-\s]?[A-Z]+)?\b/gi
  },
  WINAICO: {
    panel: /\bWSP[-\s]?\d{3,4}[A-Z]{1,3}[-\s]?\d{2}\b/gi
  },
  RISEN: {
    panel: /\bRSM\d{2}[-\s]?\d{3,4}[A-Z]{1,3}\b/gi
  },
  SERAPHIM: {
    panel: /\bSRP[-\s]?\d{3,4}[A-Z]{2,4}[-\s]?[A-Z]{2}\b/gi
  },
  MAXEON: {
    panel: /\bSPR[-\s]?[A-Z]?\d{3,4}[-\s]?[A-Z]{2,4}\b/gi
  },
  "SUNPOWER": {
    panel: /\bSPR[-\s]?[A-Z]?\d{3,4}[-\s]?[A-Z]{2,4}\b/gi
  },
  EGING: {
    panel: /\bEG[-\s]?\d{3,4}[A-Z]{2,6}[-\s]?(?:HL|BL|BF|DG|MG)(?:[-/\s]?[A-Z]{2})*\b/gi
  },

  // Inverter brands
  GOODWE: {
    inverter: /\bGW[-\s]?\d{4,5}K?[-\s]?(?:EH|ET|ES|MS|NS|XS|DNS|EMS|EMT|XSA|XNA|DT)\b/gi,
    battery: /\b(?:LX|LYNX)[-\s]?F[-\s]?\d{1,2}(?:\.\d)?[-\s]?H[-\s]?\d{2}\b/gi
  },
  SUNGROW: {
    inverter: /\bS[GH]\d{1,2}(?:\.\d)?K?(?:RS|D|RT|[-\s]?[A-Z]{1,3})\b/gi,
    battery: /\bSBR\d{3}\b/gi
  },
  SOLAREDGE: {
    inverter: /\bSE\d{4,5}K?[A-Z]?(?:[-\s]?[A-Z]{2,4})?\b/gi,
    battery: /\b(?:SOLAREDGE\s+)?(?:Energy\s+Bank|StorEdge|Battery)\s+\d{1,2}(?:\.\d)?\s*kWh?\b/gi
  },
  FRONIUS: {
    inverter: /\b(?:PRIMO|SYMO|SNAP)\s+\d{1,2}(?:\.\d)?(?:[-\s]?[13])?(?:[-\s]?[A-Z])?\b/gi
  },
  SMA: {
    inverter: /\bSB\s?\d{1,2}(?:\.\d)?(?:[-\s]?[A-Z0-9-]+)?\b/gi
  },
  SOLIS: {
    inverter: /\bS5[-\s]?[A-Z]{2}\d+K?\b/gi
  },
  GROWATT: {
    inverter: /\b(?:MIN|MID|MAX|SPH|TL3|ARK)\s?\d{1,2}(?:\.\d)?K?(?:[-\s]?[A-Z]{1,3})?\b/gi
  },
  HUAWEI: {
    inverter: /\bSUN\d{4}K?TL[-\s]?[A-Z0-9]*\b/gi
  },
  DELTA: {
    inverter: /\bRPI[-\s]?[A-Z]?\d{4}[A-Z]?\b/gi
  },
  ENPHASE: {
    inverter: /\bIQ[-\s]?\d[A-Z+]*\b/gi,
    battery: /\bIQ[-\s]?BATTERY[-\s]?(?:\d{1,2}[A-Z]?)\b/gi
  },
  "RED BACK": {
    inverter: /\b(?:RED\s?BACK|REDBACK)\s+[A-Z]+\d+\b/gi
  },
  REDBACK: {
    inverter: /\bREDBACK\s+[A-Z]+\d+\b/gi
  },

  // Battery brands
  TESLA: {
    battery: /\b(?:TESLA[-\s]?)?POWERWALL[-\s]?\d?\+?\b/gi
  },
  BYD: {
    battery: /\b(?:BYD\s+)?(?:Battery[-\s]?Box\s+Premium\s+)?(HVM|HVS|LVS)\s+\d{1,2}(?:\.\d)?\b/gi
  },
  PYLONTECH: {
    battery: /\b(US|UP)\d{4}[A-Z]?\b/gi
  },
  ALPHAESS: {
    battery: /\b(?:SMILE|STORION)(?:[-\s]?[A-Z0-9+]+)?\b/gi
  },
  SIGENERGY: {
    battery: /\bSIGEN(?:STOR|BATTERY)\s*\d{1,2}(?:\.\d)?\b/gi
  },
  GIVENERGY: {
    battery: /\bGIV[-\s]?BAT[-\s]?\d{1,2}(?:\.\d)?\b/gi
  },

  // Additional comprehensive patterns
  "GROWATT BATTERY": {
    battery: /\bARK[-\s]?\d{1,2}(?:\.\d)?[-\s]?[A-Z]{1,3}\b/gi
  },
  "HUAWEI BATTERY": {
    battery: /\bLUNA\d{4}[-\s]?[A-Z]{1,3}\b/gi
  },
  "SOLARWATT": {
    panel: /\bVISION\s+[A-Z]+\s+\d{3,4}\b/gi,
    battery: /\bMYRESERVE\s+\d{1,2}(?:\.\d)?\b/gi
  },
  "PANASONIC": {
    panel: /\bVBHN\d{3}[A-Z]{2}\d{2}\b/gi,
    battery: /\bEVERVOLT\s+\d{1,2}(?:\.\d)?\b/gi
  },
  "LG": {
    battery: /\bRESU\d{1,2}(?:\.\d)?[A-Z]?\b/gi
  },
  "SOFAR": {
    inverter: /\b(?:SOFAR|KTL-X)\s?\d{1,2}(?:\.\d)?K?[A-Z]*\b/gi
  },
  "DEYE": {
    inverter: /\bSUN[-\s]?\d{3,5}K?[-\s]?[A-Z]{1,3}\b/gi
  },
  "VICTRON": {
    inverter: /\bMULTIPLUS(?:[-\s]?II)?\s+\d{4}\/\d{2}\b/gi,
    battery: /\bLiFePO4\s+\d{1,3}Ah\b/gi
  },
  "SELECTRONIC": {
    inverter: /\bSP[-\s]?PRO\s+\d{4}\b/gi
  }
};