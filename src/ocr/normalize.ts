import { PanelCandidate, BatteryCandidate, InverterExtract } from './extract.types';

// Brand canonicalization mappings
const brandCanonical: Record<string, string> = {
  // Solar brands
  'sigen': 'sigenergy',
  'sigenpower': 'sigenergy',
  'jinko': 'jinkosolar',
  'ja solar': 'ja solar',
  'canadian solar': 'canadian solar',
  
  // Battery brands  
  'tesla': 'tesla',
  'lg chem': 'lg chem',
  'alpha ess': 'alpha ess',
  
  // Inverter brands
  'solar edge': 'solaredge',
  'schneider': 'schneider electric',
};

// Unit normalization
export const normalizeUnit = (value: string): { value: number; unit: string } => {
  const cleanValue = value.toLowerCase().replace(/[^\d\.\w]/g, '');
  const numMatch = cleanValue.match(/(\d+(?:\.\d+)?)/);
  const unitMatch = cleanValue.match(/(k?wh?)/);
  
  if (!numMatch) return { value: 0, unit: 'unknown' };
  
  let num = parseFloat(numMatch[1]);
  let unit = unitMatch?.[1] || 'w';
  
  // Normalize units
  if (unit === 'wh') {
    num = num / 1000;
    unit = 'kwh';
  } else if (unit === 'kw') {
    unit = 'kw';
  } else {
    unit = 'w';
  }
  
  return { value: num, unit };
};

// Brand normalization
export const normalizeBrand = (brand?: string): string | undefined => {
  if (!brand) return undefined;
  
  const cleaned = brand.toLowerCase().trim().replace(/\s+/g, ' ');
  return brandCanonical[cleaned] || cleaned;
};

// Model normalization
export const normalizeModel = (model?: string): string | undefined => {
  if (!model) return undefined;
  
  return model
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s\-\.]/g, '')
    .replace(/\-+/g, '-')
    .replace(/\.+/g, '.')
    .toUpperCase();
};

// Normalize panel candidate
export const normalize = {
  panel: (candidate: PanelCandidate): PanelCandidate => {
    const normalized = { ...candidate };
    
    // Normalize brand and model
    normalized.brand = normalizeBrand(candidate.brand);
    normalized.model = normalizeModel(candidate.model);
    
    // Derive missing values
    if (normalized.count && normalized.wattage && !normalized.arrayKwDc) {
      normalized.arrayKwDc = (normalized.count * normalized.wattage) / 1000;
    } else if (normalized.arrayKwDc && normalized.wattage && !normalized.count) {
      normalized.count = Math.round((normalized.arrayKwDc * 1000) / normalized.wattage);
    } else if (normalized.arrayKwDc && normalized.count && !normalized.wattage) {
      normalized.wattage = Math.round((normalized.arrayKwDc * 1000) / normalized.count);
    }
    
    return normalized;
  },
  
  battery: (candidate: BatteryCandidate): BatteryCandidate => {
    const normalized = { ...candidate };
    
    // Normalize brand and model
    normalized.brand = normalizeBrand(candidate.brand);
    normalized.model = normalizeModel(candidate.model);
    
    // Reconcile stack vs usable capacity
    if (normalized.stack && normalized.stack.modules && normalized.stack.moduleKWh) {
      const stackTotal = normalized.stack.modules * normalized.stack.moduleKWh;
      
      if (!normalized.usableKWh) {
        normalized.usableKWh = stackTotal;
      } else if (Math.abs(normalized.usableKWh - stackTotal) < 0.5) {
        // Close enough, prefer stated usable
        normalized.stack.totalKWh = normalized.usableKWh;
      } else {
        // Conflict - prefer stack calculation but flag warning
        normalized.usableKWh = stackTotal;
        normalized.stack.totalKWh = stackTotal;
      }
    }
    
    return normalized;
  },
  
  inverter: (extract: InverterExtract): InverterExtract => {
    const normalized = { ...extract };
    
    // Light normalization only (no DB lookup)
    if (normalized.brandRaw) {
      normalized.brandRaw = normalized.brandRaw.trim().replace(/\s+/g, ' ');
    }
    
    if (normalized.modelRaw) {
      normalized.modelRaw = normalized.modelRaw.trim().replace(/\s+/g, ' ');
    }
    
    return normalized;
  },
};

// Context-based unit correction
export const correctUnitByContext = (text: string, context: string): string => {
  const lowerText = text.toLowerCase();
  const hasBatteryContext = /battery|storage|usable|capacity/.test(lowerText);
  const hasPanelContext = /panel|array|solar|module/.test(lowerText);
  
  // If we see "25kw" near battery context, likely should be "25kwh"
  if (hasBatteryContext && /\d+\s*kw(?!h)/.test(text)) {
    return text.replace(/kw(?!h)/gi, 'kWh');
  }
  
  // If we see "440kwh" near panel context, likely should be "440w"
  if (hasPanelContext && /\d{3,4}\s*kwh/.test(text)) {
    return text.replace(/kwh/gi, 'W');
  }
  
  return text;
};