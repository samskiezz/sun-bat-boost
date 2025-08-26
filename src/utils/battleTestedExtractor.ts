import { supabase } from '@/integrations/supabase/client';

export type ProdType = "panel" | "inverter" | "battery";

export interface Product {
  id: string;
  type: ProdType;
  brand: string;
  model: string;
  aliases: string[];
  regex?: string;
  specs?: Record<string, any>;
  power_rating?: number;
  capacity_kwh?: number;
}

export interface DetectedProduct {
  raw: string;
  normalized: string;
  type: ProdType;
  position: number;
  context: string;
  rawScore: number;
}

export interface MatchedProduct {
  detected: DetectedProduct;
  product: Product;
  confidence: number;
  matchType: 'regex' | 'alias' | 'fuzzy';
  brandMatch: boolean;
  specMatch: boolean;
}

// Character fixes and OCR confusion patterns
const CHAR_FIXES: [RegExp, string][] = [
  [/[–—−]/g, "-"],
  [/\s+/g, " "],
  [/\r/g, ""],
];

const OCR_CONFUSIONS: [RegExp, string][] = [
  [/(\bGW)\s?([0O])(\d{3})/g, "$10$3"], // GW O000 -> GW0000
  [/(\bEG)\s?([0O])(\d{2,3})/g, "$10$3"], // EG O40 -> EG040
  [/(\w)([IL1])(\d)/g, "$11$3"], // Fix I/L/1 confusions in model numbers
  [/(\w)([O0])(\w)/g, "$10$3"], // Fix O/0 confusions
];

// Section anchors that boost confidence
const ANCHORS = [
  /YOUR\s+SOLUTION/i,
  /QUOTATION/i,
  /SYSTEM\s+COMPONENTS/i,
  /EQUIPMENT\s+SPECIFICATION/i,
  /PROPOSED\s+SYSTEM/i,
  /SOLAR\s+PANELS?/i,
  /INVERTER/i,
  /BATTERY\s+STORAGE/i,
];

// Regex patterns for common products
const PRODUCT_PATTERNS = {
  // GoodWe EH inverters
  goodwe_eh: /\bGW\s?\d{4}\s?-?(?:[A-Z]+)?EH\b/gi,
  
  // GoodWe Lynx F G2 batteries
  goodwe_lynx: /\bLX\s?-?F\s?\d{1,2}(?:\.\d)?-H-20\b/gi,
  
  // EGING panels
  eging_440: /\bEG[-\s]?440NT54[-\s]?HL(?:[/-\s]?BF)?[-\s]?DG\b/gi,
  
  // JinkoSolar Tiger Neo
  jinko_tiger: /\bJKM\d{3}[A-Z0-9\-]*(?:\s*Tiger\s*Neo)?\b/gi,
  
  // Generic model pattern (safety net)
  generic_model: /\b[A-Z]{1,6}[-\s]?[A-Z0-9]{2,}(?:[-/][A-Z0-9.]{1,})+\b/gi,
};

class BattleTestedExtractor {
  private products: Product[] = [];
  private initialized = false;

  async initialize() {
    if (this.initialized) return;
    
    console.log('🚀 Initializing Battle-Tested Extractor...');
    
    // Load from existing Supabase tables
    await this.loadProductDatabase();
    
    this.initialized = true;
    console.log(`✅ Loaded ${this.products.length} products for matching`);
  }

  private async loadProductDatabase() {
    // Load panels from pv_modules
    const { data: panels } = await supabase
      .from('pv_modules')
      .select('*')
      .eq('approval_status', 'approved'); // lowercase 'approved'

    if (panels) {
      for (const panel of panels) {
        this.products.push({
          id: panel.id.toString(),
          type: 'panel',
          brand: panel.brand,
          model: panel.model,
          aliases: this.generateAliases(panel.brand, panel.model),
          regex: this.generateRegex(panel.brand, panel.model, 'panel'),
          specs: { watts: panel.power_rating },
          power_rating: panel.power_rating,
        });
      }
    }

    // Load batteries
    const { data: batteries } = await supabase
      .from('batteries')
      .select('*')
      .eq('approval_status', 'approved'); // lowercase 'approved'

    if (batteries) {
      for (const battery of batteries) {
        this.products.push({
          id: battery.id.toString(),
          type: 'battery',
          brand: battery.brand,
          model: battery.model,
          aliases: this.generateAliases(battery.brand, battery.model),
          regex: this.generateRegex(battery.brand, battery.model, 'battery'),
          specs: { capacity_kwh: battery.capacity_kwh },
          capacity_kwh: battery.capacity_kwh,
        });
      }
    }

    // Add some known patterns for common products not in DB
    this.addKnownPatterns();
  }

  private generateAliases(brand: string, model: string): string[] {
    const aliases = [];
    const baseModel = model.toUpperCase();
    
    // Generate spacing variants
    aliases.push(baseModel.replace(/[-]/g, ' '));
    aliases.push(baseModel.replace(/\s/g, '-'));
    aliases.push(baseModel.replace(/[/]/g, '-'));
    aliases.push(baseModel.replace(/[-\s]/g, ''));
    
    // Add brand + model combinations
    aliases.push(`${brand.toUpperCase()} ${baseModel}`);
    aliases.push(`${brand.toUpperCase()}-${baseModel}`);
    
    return [...new Set(aliases)]; // Remove duplicates
  }

  private generateRegex(brand: string, model: string, type: ProdType): string {
    const brandPattern = brand.toUpperCase().replace(/\s/g, '\\s?');
    const modelPattern = model.toUpperCase()
      .replace(/[-]/g, '[-\\s]?')
      .replace(/\./g, '\\.')
      .replace(/\//g, '[/\\-\\s]?');
    
    return `\\b${brandPattern}[-\\s]?${modelPattern}\\b`;
  }

  private addKnownPatterns() {
    // Add hardcoded patterns for common products
    this.products.push({
      id: 'goodwe-gw6000-eh',
      type: 'inverter',
      brand: 'GOODWE',
      model: 'GW6000-EH',
      aliases: ['GW 6000 EH', 'GW-6000-EH', 'GW6000EH'],
      regex: '\\bGW\\s?\\d{4}\\s?-?EH\\b',
      specs: { phase: '1P', kW: 6 },
    });

    this.products.push({
      id: 'goodwe-lx-f12.8-h-20',
      type: 'battery',
      brand: 'GOODWE',
      model: 'LX F12.8-H-20',
      aliases: ['LXF12.8-H-20', 'LX-F12.8-H-20', 'LYNX F 12.8 H 20'],
      regex: '\\bLX\\s?-?F\\s?\\d{1,2}(?:\\.\\d)?-H-20\\b',
      specs: { usable_kWh: 12.8 },
      capacity_kwh: 12.8,
    });

    this.products.push({
      id: 'eging-eg-440nt54-hl-bf-dg',
      type: 'panel',
      brand: 'EGING',
      model: 'EG-440NT54-HL/BF-DG',
      aliases: ['EG-440NT54-HL-BF-DG', 'EG 440NT54 HL/BF DG', 'EG-440NT54 HL BF DG'],
      regex: '\\bEG[-\\s]?440NT54[-\\s]?HL(?:[/\\-\\s]?BF)?[-\\s]?DG\\b',
      specs: { W: 440 },
      power_rating: 440,
    });
  }

  // Main extraction function
  async extractModelsFromText(text: string): Promise<DetectedProduct[]> {
    await this.initialize();
    
    console.log('🔍 Starting battle-tested extraction...');
    
    // Step 1: Normalize text
    const normalizedText = this.normalize(text);
    
    // Step 2: Extract candidates using multiple passes
    const candidates = this.multiPassExtraction(normalizedText);
    
    // Step 3: Score candidates with evidence
    const scored = this.scoreWithEvidence(candidates, normalizedText);
    
    // Step 4: Filter and deduplicate
    const filtered = this.filterAndDeduplicate(scored);
    
    console.log(`✅ Extracted ${filtered.length} high-confidence products`);
    return filtered;
  }

  private normalize(text: string): string {
    let normalized = text.toUpperCase();
    
    // Apply character fixes
    for (const [regex, replacement] of CHAR_FIXES) {
      normalized = normalized.replace(regex, replacement);
    }
    
    // Fix hyphenated line breaks
    normalized = normalized.replace(/(\w)-\n(\w)/g, '$1$2');
    
    // Apply OCR confusion fixes (only in model-like tokens)
    for (const [regex, replacement] of OCR_CONFUSIONS) {
      normalized = normalized.replace(regex, replacement);
    }
    
    return normalized.trim();
  }

  private multiPassExtraction(text: string): DetectedProduct[] {
    const candidates: DetectedProduct[] = [];
    
    // Pass 1: Regex patterns (highest confidence)
    for (const product of this.products) {
      if (product.regex) {
        const regex = new RegExp(product.regex, 'gi');
        let match;
        while ((match = regex.exec(text)) !== null) {
          candidates.push({
            raw: match[0],
            normalized: match[0].toUpperCase(),
            type: product.type,
            position: match.index,
            context: this.getContext(text, match.index),
            rawScore: 0.40, // Base regex score
          });
        }
      }
    }
    
    // Pass 2: Alias exact matching
    for (const product of this.products) {
      for (const alias of product.aliases) {
        const aliasRegex = new RegExp(`\\b${alias.replace(/[-/\s]/g, '[-/\\s]?')}\\b`, 'gi');
        let match;
        while ((match = aliasRegex.exec(text)) !== null) {
          // Skip if already found by regex
          if (!candidates.some(c => Math.abs(c.position - match!.index) < 10)) {
            candidates.push({
              raw: match[0],
              normalized: match[0].toUpperCase(),
              type: product.type,
              position: match.index,
              context: this.getContext(text, match.index),
              rawScore: 0.30, // Base alias score
            });
          }
        }
      }
    }
    
    // Pass 3: Pattern-based extraction for unknown models
    for (const [patternName, pattern] of Object.entries(PRODUCT_PATTERNS)) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        // Skip if already found
        if (!candidates.some(c => Math.abs(c.position - match!.index) < 10)) {
          const type = this.inferTypeFromPattern(patternName, match[0]);
          if (type) {
            candidates.push({
              raw: match[0],
              normalized: match[0].toUpperCase(),
              type,
              position: match.index,
              context: this.getContext(text, match.index),
              rawScore: 0.25, // Base pattern score
            });
          }
        }
      }
    }
    
    return candidates;
  }

  private getContext(text: string, position: number, windowSize: number = 200): string {
    const start = Math.max(0, position - windowSize);
    const end = Math.min(text.length, position + windowSize);
    return text.slice(start, end);
  }

  private inferTypeFromPattern(patternName: string, match: string): ProdType | null {
    if (patternName.includes('inverter') || /GW\d{4}/.test(match)) return 'inverter';
    if (patternName.includes('battery') || /LX.*F|kwh/i.test(match)) return 'battery';
    if (patternName.includes('panel') || /JKM|EG.*\d{3}/.test(match)) return 'panel';
    
    // Fallback: try to infer from content
    if (/\d{3,4}W/i.test(match)) return 'panel';
    if (/\d{1,2}\.?\d*kWh/i.test(match)) return 'battery';
    if (/\d{1,2}\.?\d*kW/i.test(match)) return 'inverter';
    
    return null;
  }

  private scoreWithEvidence(candidates: DetectedProduct[], text: string): DetectedProduct[] {
    return candidates.map(candidate => {
      let score = candidate.rawScore;
      
      // Section boost: higher score if under key headings
      score += this.getSectionBoost(text, candidate.position);
      
      // Quantity boost: higher score if preceded by quantity pattern
      score += this.getQuantityBoost(candidate.context);
      
      // Spec matching boost
      score += this.getSpecBoost(candidate.context, candidate.type);
      
      // Brand context boost
      score += this.getBrandBoost(candidate.context, candidate.normalized);
      
      // Datasheet demotion
      if (this.isInDatasheet(candidate.context)) {
        score -= 0.20;
      }
      
      return { ...candidate, rawScore: Math.max(0, Math.min(1, score)) };
    });
  }

  private getSectionBoost(text: string, position: number): number {
    for (const anchor of ANCHORS) {
      const match = anchor.exec(text);
      if (match && position > match.index && position - match.index < 1500) {
        return 0.25;
      }
    }
    return 0;
  }

  private getQuantityBoost(context: string): number {
    return /\b(\d+\s*[X×]\s*)?[A-Z0-9]/.test(context) ? 0.20 : 0;
  }

  private getSpecBoost(context: string, type: ProdType): number {
    switch (type) {
      case 'panel':
        return /\d{3,4}\s*W/i.test(context) ? 0.10 : 0;
      case 'battery':
        return /\d{1,2}(?:\.\d)?\s*kWh/i.test(context) ? 0.10 : 0;
      case 'inverter':
        return /\d(?:\.\d)?\s*kW/i.test(context) ? 0.10 : 0;
      default:
        return 0;
    }
  }

  private getBrandBoost(context: string, normalized: string): number {
    const commonBrands = ['GOODWE', 'EGING', 'JINKO', 'TRINA', 'CANADIAN', 'LG', 'TESLA', 'SIGENERGY'];
    for (const brand of commonBrands) {
      if (normalized.includes(brand) && new RegExp(`\\b${brand}\\b`, 'i').test(context)) {
        return 0.10;
      }
    }
    return 0;
  }

  private isInDatasheet(context: string): boolean {
    return /datasheet|specification|tech.*sheet|appendix/i.test(context);
  }

  private filterAndDeduplicate(candidates: DetectedProduct[]): DetectedProduct[] {
    // Sort by score descending
    const sorted = candidates.sort((a, b) => b.rawScore - a.rawScore);
    
    // Group by type and position (deduplicate nearby matches)
    const groups = new Map<string, DetectedProduct[]>();
    
    for (const candidate of sorted) {
      // Only keep high-confidence matches
      if (candidate.rawScore < 0.65) continue;
      
      const key = `${candidate.type}-${Math.floor(candidate.position / 50)}`; // Group by 50-char windows
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(candidate);
    }
    
    // Take the best from each group
    const deduplicated: DetectedProduct[] = [];
    for (const group of groups.values()) {
      deduplicated.push(group[0]); // Already sorted by score
    }
    
    return deduplicated;
  }

  // Cross-reference detected products with database
  async crossRef(detected: DetectedProduct[]): Promise<MatchedProduct[]> {
    await this.initialize();
    
    const matches: MatchedProduct[] = [];
    
    for (const item of detected) {
      const match = await this.findBestMatch(item);
      if (match) {
        matches.push(match);
      }
    }
    
    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  private async findBestMatch(detected: DetectedProduct): Promise<MatchedProduct | null> {
    let bestMatch: MatchedProduct | null = null;
    let bestScore = 0;
    
    for (const product of this.products) {
      if (product.type !== detected.type) continue;
      
      const match = this.calculateMatch(detected, product);
      if (match && match.confidence > bestScore && match.confidence >= 0.70) {
        bestMatch = match;
        bestScore = match.confidence;
      }
    }
    
    return bestMatch;
  }

  private calculateMatch(detected: DetectedProduct, product: Product): MatchedProduct | null {
    let confidence = detected.rawScore; // Start with detection confidence
    let matchType: 'regex' | 'alias' | 'fuzzy' = 'fuzzy';
    
    // Regex match (highest confidence)
    if (product.regex) {
      const regex = new RegExp(product.regex, 'i');
      if (regex.test(detected.normalized)) {
        confidence += 0.30;
        matchType = 'regex';
      }
    }
    
    // Alias match
    if (matchType === 'fuzzy') {
      for (const alias of product.aliases) {
        if (detected.normalized.includes(alias) || alias.includes(detected.normalized)) {
          confidence += 0.25;
          matchType = 'alias';
          break;
        }
      }
    }
    
    // Brand matching
    const brandMatch = detected.normalized.includes(product.brand.toUpperCase()) ||
                      detected.context.toUpperCase().includes(product.brand.toUpperCase());
    
    if (brandMatch) {
      confidence += 0.15;
    }
    
    // Spec matching
    const specMatch = this.checkSpecMatch(detected, product);
    if (specMatch) {
      confidence += 0.10;
    }
    
    // Must have minimum confidence
    if (confidence < 0.70) return null;
    
    return {
      detected,
      product,
      confidence: Math.min(1, confidence),
      matchType,
      brandMatch,
      specMatch,
    };
  }

  private checkSpecMatch(detected: DetectedProduct, product: Product): boolean {
    switch (detected.type) {
      case 'panel':
        if (product.power_rating) {
          const wattMatch = detected.context.match(/(\d{3,4})\s*W/i);
          if (wattMatch) {
            const watts = parseInt(wattMatch[1]);
            return Math.abs(watts - product.power_rating) <= 50; // Within 50W
          }
        }
        break;
      
      case 'battery':
        if (product.capacity_kwh) {
          const kwhMatch = detected.context.match(/(\d{1,2}(?:\.\d)?)\s*kWh/i);
          if (kwhMatch) {
            const kwh = parseFloat(kwhMatch[1]);
            return Math.abs(kwh - product.capacity_kwh) <= 2; // Within 2kWh
          }
        }
        break;
        
      case 'inverter':
        if (product.specs?.kW) {
          const kwMatch = detected.context.match(/(\d(?:\.\d)?)\s*kW/i);
          if (kwMatch) {
            const kw = parseFloat(kwMatch[1]);
            return Math.abs(kw - product.specs.kW) <= 1; // Within 1kW
          }
        }
        break;
    }
    return false;
  }
}

// Export singleton instance
export const battleTestedExtractor = new BattleTestedExtractor();

// Main API functions
export async function extractModelsFromPdf(file: File): Promise<DetectedProduct[]> {
  // This will be implemented to handle PDF text extraction
  const text = await extractTextFromFile(file);
  return battleTestedExtractor.extractModelsFromText(text);
}

export async function crossRef(detected: DetectedProduct[]): Promise<MatchedProduct[]> {
  return battleTestedExtractor.crossRef(detected);
}

// Helper function to extract text from files
async function extractTextFromFile(file: File): Promise<string> {
  const { extractTextFromFile: extract } = await import('./pdfTextExtractor');
  const result = await extract(file);
  return result.text;
}
