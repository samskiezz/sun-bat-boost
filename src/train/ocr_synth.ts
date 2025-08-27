import { NoiseLevel } from './types';

export function mutateForOcr(text: string, level: NoiseLevel = 'medium'): string {
  let mutated = text;
  
  const mutations = {
    low: 0.05,
    medium: 0.15,
    high: 0.3
  };
  
  const mutationRate = mutations[level];
  
  // Common OCR errors
  const substitutions = [
    [/fi/g, 'ﬁ'], // Ligature
    [/fl/g, 'ﬂ'], // Ligature
    [/O/g, '0'], // O to zero
    [/0/g, 'O'], // Zero to O
    [/l/g, '1'], // l to 1
    [/1/g, 'l'], // 1 to l
    [/rn/g, 'm'], // rn to m
    [/\s+/g, ' '], // Multiple spaces
    [/–/g, '-'], // En dash to hyphen
    [/—/g, '-'], // Em dash to hyphen
    [/"/g, '"'], // Smart quotes
    [/"/g, '"'], // Smart quotes
    [/'/g, "'"], // Smart apostrophe
  ];
  
  // Apply random substitutions
  substitutions.forEach(([pattern, replacement]) => {
    if (Math.random() < mutationRate) {
      mutated = mutated.replace(pattern, replacement as string);
    }
  });
  
  // Add random line breaks and spacing issues
  if (Math.random() < mutationRate) {
    mutated = mutated.replace(/(\w+)\s+(\w+)/g, (match, w1, w2) => {
      if (Math.random() < 0.3) {
        return `${w1}\n${w2}`; // Break line
      }
      if (Math.random() < 0.3) {
        return `${w1}${w2}`; // Merge words
      }
      return match;
    });
  }
  
  // Inject marketing noise
  if (Math.random() < mutationRate) {
    const marketingPhrases = [
      'PREMIUM QUALITY SOLAR SOLUTION',
      'AUSTRALIAN OWNED & OPERATED',
      'TIER 1 MANUFACTURER',
      'INDUSTRY LEADING WARRANTY',
      'CLEAN ENERGY COUNCIL APPROVED'
    ];
    
    const phrase = marketingPhrases[Math.floor(Math.random() * marketingPhrases.length)];
    const lines = mutated.split('\n');
    const insertIndex = Math.floor(Math.random() * lines.length);
    lines.splice(insertIndex, 0, phrase);
    mutated = lines.join('\n');
  }
  
  return mutated;
}

type PanelProduct = { brand: string; models: string[]; watts: number[]; };
type BatteryProduct = { brand: string; models: string[]; kwh: number[]; };
type InverterProduct = { brand: string; models: string[]; kw: number[]; };

// Enhanced product database for training
const TRAINING_PRODUCTS = {
  panels: [
    { brand: 'TRINA', models: ['VERTEX S', 'TALLMAX M', 'DUOMAX V'], watts: [400, 420, 540, 600] },
    { brand: 'JINKO', models: ['TIGER PRO', 'CHEETAH HC', 'SWAN'], watts: [380, 400, 420, 480] },
    { brand: 'CANADIAN SOLAR', models: ['HIKU7', 'BIHIKU7', 'TOPCON'], watts: [400, 420, 450, 550] },
    { brand: 'LONGI', models: ['HI-MO6', 'HI-MO X6', 'HIMO7'], watts: [420, 450, 540, 570] },
    { brand: 'JA SOLAR', models: ['JAM72S30', 'JAM54S31', 'DEEPBLUE 4.0'], watts: [400, 435, 460, 535] },
    { brand: 'REC', models: ['ALPHA PURE', 'TWIN PEAK', 'N-PEAK'], watts: [380, 400, 420] }
  ] as PanelProduct[],
  batteries: [
    { brand: 'TESLA', models: ['POWERWALL 2', 'POWERWALL 3', 'POWERPACK'], kwh: [13.5, 13.5, 20] },
    { brand: 'PYLONTECH', models: ['US3000C', 'US5000', 'FORCE H2'], kwh: [3.55, 4.8, 10.65] },
    { brand: 'BYD', models: ['BATTERY-BOX PREMIUM', 'HVM', 'HVS'], kwh: [2.56, 5.12, 10.24] },
    { brand: 'ENPHASE', models: ['IQ BATTERY 5P', 'IQ BATTERY 10', 'IQ BATTERY 3'], kwh: [5.0, 10.08, 3.36] },
    { brand: 'SONNEN', models: ['ECO 8', 'ECO 10', 'CORE'], kwh: [8, 10, 10] },
    { brand: 'SUNGROW', models: ['SBR096', 'SBR128', 'SBR160'], kwh: [9.6, 12.8, 16] }
  ] as BatteryProduct[],
  inverters: [
    { brand: 'FRONIUS', models: ['PRIMO', 'SYMO', 'GEN24'], kw: [3, 5, 8.2, 10, 15, 20] },
    { brand: 'SMA', models: ['SUNNY BOY', 'SUNNY TRIPOWER', 'CORE1'], kw: [3.6, 5, 6, 8, 10, 12] },
    { brand: 'SUNGROW', models: ['SG5K-D', 'SG8K-D', 'SG10KTL'], kw: [5, 8, 10, 15, 20] },
    { brand: 'HUAWEI', models: ['SUN2000', 'SUN2000L', 'SUN2000M'], kw: [3, 4, 5, 6, 8, 10] },
    { brand: 'GOODWE', models: ['GW5000-NS', 'GW6000-NS', 'GW8000-NS'], kw: [5, 6, 8, 10] },
    { brand: 'SOLAREDGE', models: ['SE3000H', 'SE5000H', 'SE7600H'], kw: [3, 5, 7.6, 10] }
  ] as InverterProduct[]
};

function selectRandomProduct(type: 'panels'): { brand: string; model: string; watts: number };
function selectRandomProduct(type: 'batteries'): { brand: string; model: string; kwh: number };
function selectRandomProduct(type: 'inverters'): { brand: string; model: string; kw: number };
function selectRandomProduct(type: 'panels' | 'batteries' | 'inverters') {
  if (type === 'panels') {
    const products = TRAINING_PRODUCTS.panels;
    const product = products[Math.floor(Math.random() * products.length)];
    const model = product.models[Math.floor(Math.random() * product.models.length)];
    const watts = product.watts[Math.floor(Math.random() * product.watts.length)];
    return { brand: product.brand, model, watts };
  } else if (type === 'batteries') {
    const products = TRAINING_PRODUCTS.batteries;
    const product = products[Math.floor(Math.random() * products.length)];
    const model = product.models[Math.floor(Math.random() * product.models.length)];
    const kwh = product.kwh[Math.floor(Math.random() * product.kwh.length)];
    return { brand: product.brand, model, kwh };
  } else {
    const products = TRAINING_PRODUCTS.inverters;
    const product = products[Math.floor(Math.random() * products.length)];
    const model = product.models[Math.floor(Math.random() * product.models.length)];
    const kw = product.kw[Math.floor(Math.random() * product.kw.length)];
    return { brand: product.brand, model, kw };
  }
}

export async function synthProposalFromSpec(productIds?: string[]): Promise<{ 
  pdfPath?: string; 
  text: string;
  groundTruth: {
    panel: { brand: string; model: string; watts: number };
    battery: { brand: string; model: string; kwh: number };
    inverter: { brand: string; model: string; kw: number };
    systemKw: number;
    panelQty: number;
  };
}> {
  // Generate diverse synthetic proposal with random realistic products
  const panel = selectRandomProduct('panels');
  const battery = selectRandomProduct('batteries');
  const inverter = selectRandomProduct('inverters');
  
  const panelQty = 15 + Math.floor(Math.random() * 25);
  const systemKw = (panel.watts * panelQty / 1000).toFixed(1);
  
  const templates = [
    // Template 1: Standard Quote Format
    `SOLAR ENERGY SYSTEM QUOTATION

Customer: ${['John Smith', 'Sarah Wilson', 'Michael Johnson'][Math.floor(Math.random() * 3)]}
Quote Date: ${new Date().toLocaleDateString()}
Valid Until: ${new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString()}

SYSTEM COMPONENTS:

Solar Panels:
${panel.brand} ${panel.model} ${panel.watts}W
Quantity: ${panelQty} panels
Total DC Capacity: ${systemKw} kW

String Inverter:
${inverter.brand} ${inverter.model} ${inverter.kw}kW Single Phase
Maximum AC Output: ${inverter.kw}kW

Energy Storage:
${battery.brand} ${battery.model}
Usable Capacity: ${battery.kwh}kWh
Backup Power: Yes

System Specifications:
- Total DC: ${systemKw}kW
- Total AC: ${inverter.kw}kW
- Battery: ${battery.kwh}kWh
- Estimated Annual Production: ${(parseInt(systemKw) * 1350).toFixed(0)}kWh

Investment: $${(parseInt(systemKw) * 1200 + Math.random() * 5000).toFixed(0)}
25 Year System Warranty Included`,

    // Template 2: Invoice Style
    `INVOICE - SOLAR INSTALLATION

Invoice #: INV-2024-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}
Customer: Training Customer ${Math.floor(Math.random() * 100)}
Installation Address: ${Math.floor(Math.random() * 999) + 1} Solar Street, ${['Brisbane', 'Sydney', 'Melbourne'][Math.floor(Math.random() * 3)]} ${3000 + Math.floor(Math.random() * 6000)}

INSTALLED EQUIPMENT:

PV Modules: ${panel.brand} ${panel.model}
Model: ${panel.model} - ${panel.watts}W
Quantity: ${panelQty} units
Total Capacity: ${systemKw}kW DC

Power Conditioning: ${inverter.brand} ${inverter.model}
Rating: ${inverter.kw}kW AC Output
Configuration: ${Math.random() > 0.5 ? 'Single Phase' : 'Three Phase'}

Battery System: ${battery.brand} ${battery.model}
Storage Capacity: ${battery.kwh}kWh Usable
Chemistry: Lithium Ion
Warranty: 10 Years

Total System Investment: $${(parseInt(systemKw) * 1300 + Math.random() * 8000).toFixed(0)}
GST Included`,

    // Template 3: Proposal Format
    `RESIDENTIAL SOLAR PROPOSAL

Property Owner: Customer Training Account
System Design Date: ${new Date().toLocaleDateString()}
Postcode: ${3000 + Math.floor(Math.random() * 6000)}

RECOMMENDED SOLAR SOLUTION:

Tier 1 Solar Panels:
Brand: ${panel.brand}
Model: ${panel.model}
Power Output: ${panel.watts}W per panel
Total Panels: ${panelQty}
System Size: ${systemKw}kW

Hybrid Inverter System:
Manufacturer: ${inverter.brand}
Model: ${inverter.model}
Capacity: ${inverter.kw}kW
Type: Grid-Tied with Battery Ready

Battery Storage (Optional):
Brand: ${battery.brand}
Model: ${battery.model}
Capacity: ${battery.kwh}kWh
Depth of Discharge: 95%

SYSTEM PERFORMANCE:
Expected Annual Generation: ${(parseInt(systemKw) * 1400).toFixed(0)} kWh
25-Year Production Estimate: ${(parseInt(systemKw) * 1400 * 25).toFixed(0)} kWh
System Efficiency: ${92 + Math.random() * 4}%

Investment Summary:
Solar System: $${(parseInt(systemKw) * 1100).toFixed(0)}
Battery Add-on: $${(battery.kwh * 800).toFixed(0)}
Total: $${(parseInt(systemKw) * 1100 + battery.kwh * 800).toFixed(0)}`
  ];

  const selectedTemplate = templates[Math.floor(Math.random() * templates.length)];
  
  return {
    text: selectedTemplate.trim(),
    groundTruth: {
      panel,
      battery,
      inverter,
      systemKw: parseFloat(systemKw),
      panelQty
    }
  };
}

export function injectCommonOCRErrors(text: string): string {
  // Inject specific OCR errors that are common in real documents
  let corrupted = text;
  
  // Table formatting corruption
  corrupted = corrupted.replace(/(\d+)\s+(\w+)/g, (match, num, word) => {
    if (Math.random() < 0.2) {
      return `${num}${word}`; // Remove space in table
    }
    return match;
  });
  
  // Unit corruption
  corrupted = corrupted.replace(/kW/g, (match) => {
    const corruptions = ['kVV', 'kW', 'KW', 'kw', 'k W'];
    return Math.random() < 0.3 ? corruptions[Math.floor(Math.random() * corruptions.length)] : match;
  });
  
  corrupted = corrupted.replace(/kWh/g, (match) => {
    const corruptions = ['kVVh', 'kWh', 'KWH', 'kwh', 'k Wh', 'kW h'];
    return Math.random() < 0.3 ? corruptions[Math.floor(Math.random() * corruptions.length)] : match;
  });
  
  // Brand name corruption
  const brandCorruptions = {
    'TESLA': ['TESLLA', 'TESLA', 'Tesla', 'TESIA'],
    'FRONIUS': ['FRONJUS', 'FRONIUS', 'Fronius', 'FRONUIS'],
    'JINKO': ['JJNKO', 'JINKO', 'Jinko', 'JlNKO'],
    'TRINA': ['TRJNA', 'TRINA', 'Trina', 'TRlNA'],
  };
  
  Object.entries(brandCorruptions).forEach(([brand, corruptions]) => {
    if (corrupted.includes(brand) && Math.random() < 0.3) {
      const corruption = corruptions[Math.floor(Math.random() * corruptions.length)];
      corrupted = corrupted.replace(new RegExp(brand, 'g'), corruption);
    }
  });
  
  return corrupted;
}