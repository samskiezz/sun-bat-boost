import { PanelCandidate, BatteryCandidate, InverterExtract } from './extract.types';

// Comprehensive brand patterns with OCR variations and keyword detection
const PANEL_BRANDS = [
  'jinko|jink0|jinc0|j1nko|j1nc0|jkm\\d+',
  'trina|tr1na|trtna|trin4|tsm\\d+|tiger\\s+neo',
  'canadian\\s+solar|canad1an\\s+solar|can4dian\\s+solar|cs\\d+',
  'lg|l6|16|lg\\s+solar|lg\\s+neon',
  'sunpower|sun\\s*power|sunp0wer|spwr',
  'rec|r3c|rec\\s+solar|rec\\s+alpha|rec\\s+twin',
  'hanwha|hanwh4|h4nwha|q\\s*cells|qcells|q\\.peak',
  'ja\\s+solar|j4\\s+solar|jasolar|jam\\d+',
  'longi|l0ngi|longi\\s+solar|lr\\d+|hi\\-mo',
  'tier\\s*1|t1er\\s*1|first\\s+solar',
  'sharp|sh4rp|sharp\\s+solar|nu\\d+',
  'panasonic|p4nasonic|panason1c|hit\\d+',
  'risen|r1sen|rsm\\d+',
  'seraphim|ser4phim|srp\\d+',
  'astronergy|4stronergy|chsm\\d+'
];

const BATTERY_BRANDS = [
  'tesla|tesl4|t3sla|powerwall',
  'lg\\s+chem|lg\\s+energy|lg\\s+resu|lgchem|lgresu',
  'byd|byd\\s+battery|byd\\s+premium|blade\\s+battery',
  'sonnen|s0nnen|sonnen\\s+battery|sonnencore',
  'enphase|enph4se|enph45e\\s+battery|iq\\s+battery',
  'sigen|s1gen|sig3n|sigenergy|s1genergy|sig3nergy|sigenstor',
  'growatt|gr0watt|grow4tt|arx\\s+battery',
  'alpha\\s+ess|alphaess|4lpha\\s+ess|smile\\s+battery',
  'pylontech|pyl0ntech|pylon\\s+tech|us\\d+',
  'redback|redb4ck|red\\s+back|sb\\d+',
  'goodwe|g00dwe|good\\s+we|g0odwe|lynx'
];

const INVERTER_BRANDS = [
  'fronius|fron1us|fr0nius|primo|symo|gen24',
  'sma|sm4|s\\s*m\\s*a|sunny\\s+boy|tripower',
  'solar\\s*edge|solaredge|s0laredge|se\\d+',
  'enphase|enph4se|enph45e|iq\\s+inverter|iq\\d+',
  'goodwe|g00dwe|good\\s+we|g0odwe|gw\\d+',
  'growatt|gr0watt|grow4tt|mic\\s+\\d+',
  'sungrow|sungr0w|sun\\s+grow|sg\\d+',
  'huawei|hu4wei|hua\\s*wei|sun\\d+',
  'abb|4bb|a\\s*b\\s*b|uno\\s+dm',
  'delta|delt4|de1ta|rpi\\s+\\d+',
  'schneider|schneid3r|schn3ider|conext'
];

// Enhanced context detection with keyword-based section identification
const SECTION_KEYWORDS = {
  solar: /(?:solar\s+power|solar\s+system|pv\s+system|photovoltaic|solar\s+panels?|panel\s+system)/i,
  battery: /(?:battery\s+storage|energy\s+storage|battery\s+system|storage\s+solution|backup\s+power)/i,
  inverter: /(?:inverter\s+system|power\s+conversion|dc\s+to\s+ac|inverter\s+power|string\s+inverter|micro\s+inverter)/i,
};

const PATTERNS = {
  context: {
    table: /\||\t|(?:\s{3,})/,
    header: /^.{0,50}(?:proposal\s+for|prepared\s+by|quote\s*#|valid\s+until)/i,
    footer: /(?:page\s*\d+\/\d+|©|copyright|\.com\.au|phone:|email:)/i,
    noise: /(?:^proposal\s+for|^prepared\s+by|^quote\s*#|^valid\s+until|@\w+\.com|^\d{4}\s+\d{3}\s+\d{3})/i,
    solarSection: SECTION_KEYWORDS.solar,
    batterySection: SECTION_KEYWORDS.battery,
    inverterSection: SECTION_KEYWORDS.inverter,
  },
};

const extractPanels = (text: string, page: number, context: string): PanelCandidate[] => {
  console.log('🔍 Panel extraction from text:', text.substring(0, 200) + '...');
  
  // Skip noise, headers, footers but be more selective
  if (PATTERNS.context.noise.test(text) && !PATTERNS.context.solarSection.test(text)) {
    console.log('⏭️ Skipping panel extraction from noise/header/footer');
    return [];
  }

  const candidates: PanelCandidate[] = [];
  const normalizedText = text.toLowerCase().replace(/[^\w\s\.\-]/g, ' ');
  
  // Enhanced extraction with keyword-based context detection
  const isSolarSection = PATTERNS.context.solarSection.test(text);
  console.log('🌞 Solar section detected:', isSolarSection);
  
  // Look for comprehensive panel patterns
  const patterns = [
    // Brand + Model + Wattage (e.g., "JKM440N-54HL4R-BDB 440 Watt")
    /(?:^|\\s)((?:jinko|trina|canadian|lg|sunpower|rec|hanwha|ja\\s+solar|longi|sharp|panasonic|risen|seraphim|astronergy)[\\w\\s]*?)\\s+([A-Z]{2,4}\\d{3,4}[\\w\\-]*)\\s+(\\d{3,4})\\s*w(?:att)?s?/gi,
    
    // Quantity + Brand + Model (e.g., "30 x JKM440N-54HL4R-BDB")
    /(\\d{1,3})\\s*(?:x|×|pieces?|panels?)\\s+((?:jinko|trina|canadian|lg|sunpower|rec|hanwha|ja\\s+solar|longi|sharp|panasonic|risen|seraphim|astronergy)[\\w\\s]*?)\\s+([A-Z]{2,4}\\d{3,4}[\\w\\-]*)/gi,
    
    // System size + "of Solar Power" (e.g., "13.200kW of Solar Power")
    /(\\d{1,2}\\.?\\d{0,3})\\s*kw\\s+(?:of\\s+)?solar\\s+power/gi,
    
    // Model + Wattage patterns (e.g., "TSM-440NEG9R.28 Vertex S+")
    /([A-Z]{2,4}[\\d\\-\\.]+[\\w\\-]*)\\s+(?:vertex|tiger|neon|alpha|twin|peak|mono|poly)[\\w\\s]*?\\s+(\\d{3,4})\\s*w(?:att)?s?/gi,
    
    // Direct wattage mentions near solar keywords
    /(?:solar|panel|pv)[\\w\\s]*?(\\d{3,4})\\s*w(?:att)?s?/gi,
    
    // "X Watt panels" pattern
    /(\\d{3,4})\\s*w(?:att)?\\s+panels?/gi
  ];
  
  let foundBrands: string[] = [];
  let foundModels: string[] = [];
  let foundWattages: number[] = [];
  let foundQuantities: number[] = [];
  
  patterns.forEach((pattern, index) => {
    const matches = [...text.matchAll(pattern)];
    console.log(`🔍 Pattern ${index + 1} found ${matches.length} matches`);
    
    matches.forEach(match => {
      console.log('📋 Match details:', match);
      
      if (index === 0) { // Brand + Model + Wattage
        foundBrands.push(match[1]);
        foundModels.push(match[2]);
        foundWattages.push(parseInt(match[3]));
      } else if (index === 1) { // Quantity + Brand + Model
        foundQuantities.push(parseInt(match[1]));
        foundBrands.push(match[2]);
        foundModels.push(match[3]);
      } else if (index === 2) { // System size
        const systemKW = parseFloat(match[1]);
        // Estimate panel count (assuming ~400W average)
        foundQuantities.push(Math.round(systemKW * 1000 / 400));
      } else if (index === 3) { // Model + Wattage
        foundModels.push(match[1]);
        foundWattages.push(parseInt(match[2]));
      } else if (index === 4) { // Direct wattage
        foundWattages.push(parseInt(match[1]));
      } else if (index === 5) { // "X Watt panels"
        foundWattages.push(parseInt(match[1]));
      }
    });
  });
  
  // Extract additional context - look for brand mentions
  const brandMatches = PANEL_BRANDS.map(brand => {
    const regex = new RegExp(brand, 'gi');
    return [...text.matchAll(regex)].map(m => m[0]);
  }).flat();
  
  foundBrands.push(...brandMatches);
  
  // Clean and deduplicate
  foundBrands = [...new Set(foundBrands.map(b => b.trim().toLowerCase()))];
  foundModels = [...new Set(foundModels)];
  foundWattages = [...new Set(foundWattages)];
  foundQuantities = [...new Set(foundQuantities)];
  
  console.log('🏷️ Found panel brands:', foundBrands);
  console.log('📦 Found models:', foundModels);
  console.log('⚡ Found wattages:', foundWattages);
  console.log('🔢 Found quantities:', foundQuantities);
  
  // Create candidates from combinations
  if (foundBrands.length > 0 || foundModels.length > 0 || foundWattages.length > 0) {
    const brand = foundBrands[0] || 'Unknown';
    const model = foundModels[0] || 'Unknown';
    const watts = foundWattages[0] || 0;
    const quantity = foundQuantities[0] || 0;
    
    candidates.push({
      brand: brand,
      model,
      wattage: watts,
      count: quantity,
      evidences: [
        { page, text: `Brand: ${brand}`, context: context as any, weight: 1 },
        { page, text: `Model: ${model}`, context: context as any, weight: 1 },
        ...(watts > 0 ? [{ page, text: `Wattage: ${watts}W`, context: context as any, weight: 1 }] : []),
        ...(quantity > 0 ? [{ page, text: `Quantity: ${quantity}`, context: context as any, weight: 1 }] : []),
        ...(isSolarSection ? [{ page, text: 'Solar section context', context: context as any, weight: 1 }] : [])
      ],
      score: 85,
      syntheticProduct: true,
    });
  }
  
  console.log('⚡ Total panel candidates found:', candidates.length);
  return candidates;
};

const extractBatteries = (text: string, page: number, context: string): BatteryCandidate[] => {
  console.log('🔍 Battery extraction from text:', text.substring(0, 200) + '...');
  
  const candidates: BatteryCandidate[] = [];
  const isBatterySection = PATTERNS.context.batterySection.test(text);
  console.log('🔋 Battery section detected:', isBatterySection);
  
  // Look for battery patterns with keyword context
  const patterns = [
    // "X.XkWh of Battery Storage"
    /(\\d{1,2}(?:\\.\\d+)?)\\s*kwh\\s+(?:of\\s+)?battery\\s+storage/gi,
    
    // Brand + Model + Capacity (e.g., "SigenStor BAT 32.0")
    /(sigen\\w*|tesla|lg|byd|sonnen|enphase|growatt|alpha|pylontech|redback|goodwe)\\s+([\\w\\s]+?)\\s+(\\d{1,2}(?:\\.\\d+)?)(?:\\s*kwh)?/gi,
    
    // "1 x BrandModel Capacity"
    /(\\d{1,2})\\s*x\\s+(\\w+)\\s+([\\w\\s]+?)\\s+(\\d{1,2}(?:\\.\\d+)?)(?:\\s*kwh)?/gi,
    
    // Direct capacity with battery keyword
    /(\\d{1,2}(?:\\.\\d+)?)\\s*kwh[\\w\\s]*?(?:battery|storage)/gi
  ];
  
  let foundBrands: string[] = [];
  let foundModels: string[] = [];
  let foundCapacities: number[] = [];
  let foundQuantities: number[] = [];
  
  patterns.forEach((pattern, index) => {
    const matches = [...text.matchAll(pattern)];
    console.log(`🔍 Battery Pattern ${index + 1} found ${matches.length} matches`);
    
    matches.forEach(match => {
      console.log('🔋 Battery Match details:', match);
      
      if (index === 0) { // "X.XkWh of Battery Storage"
        foundCapacities.push(parseFloat(match[1]));
      } else if (index === 1) { // Brand + Model + Capacity
        foundBrands.push(match[1]);
        foundModels.push(match[2]);
        foundCapacities.push(parseFloat(match[3]));
      } else if (index === 2) { // "1 x BrandModel Capacity"
        foundQuantities.push(parseInt(match[1]));
        foundBrands.push(match[2]);
        foundModels.push(match[3]);
        foundCapacities.push(parseFloat(match[4]));
      } else if (index === 3) { // Direct capacity
        foundCapacities.push(parseFloat(match[1]));
      }
    });
  });
  
  // Extract additional brand mentions
  const brandMatches = BATTERY_BRANDS.map(brand => {
    const regex = new RegExp(brand, 'gi');
    return [...text.matchAll(regex)].map(m => m[0]);
  }).flat();
  
  foundBrands.push(...brandMatches);
  
  // Clean and deduplicate
  foundBrands = [...new Set(foundBrands.map(b => b.trim()))];
  foundModels = [...new Set(foundModels.map(m => m.trim()))];
  foundCapacities = [...new Set(foundCapacities)];
  foundQuantities = [...new Set(foundQuantities)];
  
  console.log('🏷️ Found battery brands:', foundBrands);
  console.log('📦 Found battery models:', foundModels);
  console.log('⚡ Found capacities:', foundCapacities);
  console.log('🔢 Found quantities:', foundQuantities);
  
  // Create candidates from combinations
  if (foundBrands.length > 0 || foundCapacities.length > 0) {
    const brand = foundBrands[0] || 'Unknown';
    const model = foundModels[0] || 'Unknown';
    const capacity = foundCapacities[0] || 0;
    const quantity = foundQuantities[0] || 1;
    
    candidates.push({
      brand: brand,
      model,
      usableKWh: capacity,
      evidences: [
        { page, text: `Brand: ${brand}`, context: context as any, weight: 1 },
        { page, text: `Model: ${model}`, context: context as any, weight: 1 },
        ...(capacity > 0 ? [{ page, text: `Capacity: ${capacity}kWh`, context: context as any, weight: 1 }] : []),
        ...(quantity > 1 ? [{ page, text: `Quantity: ${quantity}`, context: context as any, weight: 1 }] : []),
        ...(isBatterySection ? [{ page, text: 'Battery section context', context: context as any, weight: 1 }] : [])
      ],
      score: 85,
      syntheticProduct: true,
    });
  }
  
  console.log('🔋 Total battery candidates found:', candidates.length);
  return candidates;
};

const extractInverter = (text: string, page: number, context: string): InverterExtract | null => {
  console.log('🔍 Inverter extraction from text:', text.substring(0, 200) + '...');
  
  // Skip noise, headers, footers
  if (PATTERNS.context.noise.test(text) && !PATTERNS.context.inverterSection.test(text)) {
    console.log('⏭️ Skipping inverter extraction from noise/header/footer');
    return null;
  }
  
  const isInverterSection = PATTERNS.context.inverterSection.test(text);
  console.log('🔌 Inverter section detected:', isInverterSection);
  
  // Look for inverter patterns
  const patterns = [
    // Brand + Model + Power (e.g., "GoodWe GW5000-NS 5kW")
    /(fronius|sma|solar\\s*edge|enphase|goodwe|growatt|sungrow|huawei|abb|delta|schneider)\\s+([\\w\\-\\s]+?)\\s+(\\d{1,2}(?:\\.\\d+)?)\\s*kw/gi,
    
    // "X kW Inverter"
    /(\\d{1,2}(?:\\.\\d+)?)\\s*kw\\s+inverter/gi,
    
    // Brand mentions near power ratings
    /(fronius|sma|solar\\s*edge|enphase|goodwe|growatt|sungrow|huawei|abb|delta|schneider)/gi
  ];
  
  let foundBrands: string[] = [];
  let foundModels: string[] = [];
  let foundPowers: number[] = [];
  
  patterns.forEach((pattern, index) => {
    const matches = [...text.matchAll(pattern)];
    console.log(`🔍 Inverter Pattern ${index + 1} found ${matches.length} matches`);
    
    matches.forEach(match => {
      console.log('🔌 Inverter Match details:', match);
      
      if (index === 0) { // Brand + Model + Power
        foundBrands.push(match[1]);
        foundModels.push(match[2]);
        foundPowers.push(parseFloat(match[3]));
      } else if (index === 1) { // "X kW Inverter"
        foundPowers.push(parseFloat(match[1]));
      } else if (index === 2) { // Brand mentions
        foundBrands.push(match[1]);
      }
    });
  });
  
  // Clean and deduplicate
  foundBrands = [...new Set(foundBrands.map(b => b.trim()))];
  foundModels = [...new Set(foundModels.map(m => m.trim()))];
  foundPowers = [...new Set(foundPowers)];
  
  console.log('🏷️ Found inverter brands:', foundBrands);
  console.log('📦 Found inverter models:', foundModels);
  console.log('⚡ Found powers:', foundPowers);
  
  // Create result if we have data
  if (foundBrands.length > 0 || foundPowers.length > 0) {
    const result: InverterExtract = {
      brandRaw: foundBrands[0] || 'Unknown',
      modelRaw: foundModels[0] || 'Unknown',
      ratedKw: foundPowers[0] || 0,
      evidences: [
        { page, text: `Brand: ${foundBrands[0] || 'Unknown'}`, context: context as any, weight: 1 },
        { page, text: `Model: ${foundModels[0] || 'Unknown'}`, context: context as any, weight: 1 },
        ...(foundPowers.length > 0 ? [{ page, text: `Power: ${foundPowers[0]}kW`, context: context as any, weight: 1 }] : []),
        ...(isInverterSection ? [{ page, text: 'Inverter section context', context: context as any, weight: 1 }] : [])
      ],
    };
    
    console.log('🔌 Inverter extraction result:', result);
    return result;
  }
  
  console.log('🔌 No inverter data found');
  return null;
};

// Helper functions for pattern matching
export const extractors = {
  extractPanels,
  extractBatteries,
  extractInverter,
};

export const patterns = {
  context: PATTERNS.context,
};