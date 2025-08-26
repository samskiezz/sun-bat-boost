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

export async function synthProposalFromSpec(productIds: string[]): Promise<{ pdfPath?: string; text: string }> {
  // Generate synthetic proposal text from product specifications
  const proposalTemplate = `
SOLAR PROPOSAL QUOTE

Customer: Training Customer
Date: ${new Date().toLocaleDateString()}
System Design Summary:

Solar Panels:
${productIds.filter(id => id.includes('panel')).map(id => {
  const parts = id.split('-');
  const brand = parts[0].toUpperCase();
  const model = parts.slice(1, -1).join(' ').toUpperCase();
  const wattage = parts[parts.length - 1].replace('w', '');
  const qty = 20 + Math.floor(Math.random() * 20);
  
  return `- ${brand} ${model} ${wattage}W x ${qty} panels
    Total DC Capacity: ${(parseInt(wattage) * qty / 1000).toFixed(1)} kW`;
}).join('\n')}

Inverter:
${productIds.filter(id => id.includes('inverter')).map(id => {
  const parts = id.split('-');
  const brand = parts[0].toUpperCase();
  const model = parts.slice(1, -1).join(' ').toUpperCase();
  const rating = parts[parts.length - 1].replace('kw', '') + 'kW';
  
  return `- ${brand} ${model} ${rating} Single Phase Inverter`;
}).join('\n')}

Battery Storage:
${productIds.filter(id => id.includes('battery')).map(id => {
  const parts = id.split('-');
  const brand = parts[0].toUpperCase();
  const model = parts.slice(1).join(' ').toUpperCase();
  const capacity = 10 + Math.floor(Math.random() * 20);
  
  return `- ${brand} ${model} ${capacity}kWh Battery System
    Usable Capacity: ${(capacity * 0.9).toFixed(1)}kWh`;
}).join('\n')}

Installation Details:
- Roof mounted system
- String configuration optimized for roof layout
- All components CEC approved
- 25 year panel warranty
- 10 year inverter warranty

Total System Price: $${(25000 + Math.random() * 20000).toFixed(0)}
Expected Annual Generation: ${(5000 + Math.random() * 3000).toFixed(0)} kWh

This proposal is valid for 30 days from date of issue.
  `;
  
  return {
    text: proposalTemplate.trim()
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