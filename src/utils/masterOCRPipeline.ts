import { catalogueClient, CatalogueProduct, INVERTER_BRANDS } from './catalogClient';
import { pdfExtractor } from './pdfExtract';

export interface EvidenceRow {
  snippet: string;
  position: number;
  matchType: 'regex' | 'alias' | 'brand';
  score: number;
  context: string;
  sectionBoost: boolean;
}

export interface OCRResult {
  panels: {
    brand: string;
    model: string;
    productId: string;
    confidence: number;
    evidence: EvidenceRow[];
    specs: { watts?: number };
  }[];
  batteries: {
    brand: string;
    model: string;
    productId: string;
    confidence: number;
    evidence: EvidenceRow[];
    specs: { kWh?: number };
  }[];
  inverters: {
    brand: string;
    model: string;
    confidence: number;
    evidence: EvidenceRow[];
    specs: { kW?: number };
  }[];
  systemSize?: { value: number; unit: string; confidence: number };
  totalCost?: { value: number; confidence: number };
  postcode?: { value: string; confidence: number };
  installer?: { name: string; confidence: number };
}

interface MatchCandidate {
  product: CatalogueProduct;
  evidence: EvidenceRow[];
  totalScore: number;
  brand: string;
  model: string;
}

interface InverterCandidate {
  brand: string;
  model: string;
  kW?: number;
  evidence: EvidenceRow[];
  totalScore: number;
}

export class MasterOCRPipeline {
  private anchors = [
    'YOUR SOLUTION', 'QUOTATION', 'SYSTEM COMPONENTS', 'INCLUSIONS', 
    'EQUIPMENT', 'SOLAR PANELS', 'BATTERY STORAGE', 'INVERTER',
    'COMPONENTS', 'SPECIFICATIONS', 'PROPOSAL'
  ];

  async process(file: File): Promise<OCRResult> {
    console.log('🚀 MASTER OCR Pipeline Starting...');
    const startTime = Date.now();
    
    try {
      // Initialize and extract
      await catalogueClient.init();
      const content = await pdfExtractor.extractFromFile(file);
      console.log(`📄 Extracted ${content.text.length} characters via ${content.method}`);
      
      // Normalize text for better matching
      const normalizedText = this.normalizeText(content.text);
      console.log(`📝 Normalized text length: ${normalizedText.length}`);
      
      // Find section anchors
      const anchorPositions = this.findAnchors(normalizedText);
      console.log(`⚓ Found ${anchorPositions.length} section anchors`);
      
      // Match all products with detailed logging
      const panels = await this.findPanels(normalizedText, anchorPositions);
      const batteries = await this.findBatteries(normalizedText, anchorPositions);
      const inverters = this.findInverters(normalizedText, anchorPositions);
      
      console.log(`✅ Detection complete in ${Date.now() - startTime}ms`);
      console.log(`🎯 Results: ${panels.length} panels, ${batteries.length} batteries, ${inverters.length} inverters`);
      
      return {
        panels: panels.map(p => this.formatPanelResult(p)),
        batteries: batteries.map(b => this.formatBatteryResult(b)),
        inverters: inverters.map(i => this.formatInverterResult(i)),
        ...this.extractSystemInfo(normalizedText)
      };
      
    } catch (error) {
      console.error('❌ OCR Pipeline Error:', error);
      return { panels: [], batteries: [], inverters: [] };
    }
  }

  private normalizeText(text: string): string {
    return text
      .toUpperCase()
      .replace(/\r\n/g, '\n')
      .replace(/[\u2013\u2014\u2015]/g, '-') // em/en dashes
      .replace(/\s+/g, ' ') // normalize spaces
      .replace(/(\w)-\s*\n\s*(\w)/g, '$1$2') // fix broken words
      .trim();
  }

  private findAnchors(text: string): number[] {
    const positions: number[] = [];
    for (const anchor of this.anchors) {
      let index = 0;
      while ((index = text.indexOf(anchor, index)) !== -1) {
        positions.push(index);
        index += anchor.length;
      }
    }
    return positions.sort((a, b) => a - b);
  }

  private async findPanels(text: string, anchors: number[]): Promise<MatchCandidate[]> {
    const panels = catalogueClient.getPanels();
    console.log(`🔍 Searching ${panels.length} panels in database...`);
    
    const candidates = new Map<string, MatchCandidate>();
    
    for (const panel of panels) {
      const key = `${panel.brand}|${panel.model}`;
      const matches = this.findProductMatches(text, panel, anchors, 'panel');
      
      if (matches.length > 0) {
        console.log(`🎯 Panel match found: ${panel.brand} ${panel.model} (${matches.length} matches)`);
        
        const totalScore = matches.reduce((sum, m) => sum + m.score, 0) / matches.length;
        
        if (!candidates.has(key) || candidates.get(key)!.totalScore < totalScore) {
          candidates.set(key, {
            product: panel,
            evidence: matches,
            totalScore,
            brand: panel.brand,
            model: panel.model
          });
        }
      }
    }
    
    const results = Array.from(candidates.values())
      .filter(c => c.totalScore >= 0.3) // Lower threshold for detection
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 5);
      
    console.log(`✅ Found ${results.length} panel candidates with scores:`, 
      results.map(r => `${r.brand} ${r.model}: ${r.totalScore.toFixed(2)}`));
    
    return results;
  }

  private async findBatteries(text: string, anchors: number[]): Promise<MatchCandidate[]> {
    const batteries = catalogueClient.getBatteries();
    console.log(`🔍 Searching ${batteries.length} batteries in database...`);
    
    const candidates = new Map<string, MatchCandidate>();
    
    for (const battery of batteries) {
      const key = `${battery.brand}|${battery.model}`;
      const matches = this.findProductMatches(text, battery, anchors, 'battery');
      
      if (matches.length > 0) {
        console.log(`🔋 Battery match found: ${battery.brand} ${battery.model} (${matches.length} matches)`);
        
        const totalScore = matches.reduce((sum, m) => sum + m.score, 0) / matches.length;
        
        if (!candidates.has(key) || candidates.get(key)!.totalScore < totalScore) {
          candidates.set(key, {
            product: battery,
            evidence: matches,
            totalScore,
            brand: battery.brand,
            model: battery.model
          });
        }
      }
    }
    
    const results = Array.from(candidates.values())
      .filter(c => c.totalScore >= 0.3) // Lower threshold for detection
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 5);
      
    console.log(`✅ Found ${results.length} battery candidates with scores:`, 
      results.map(r => `${r.brand} ${r.model}: ${r.totalScore.toFixed(2)}`));
    
    return results;
  }

  private findProductMatches(
    text: string, 
    product: CatalogueProduct, 
    anchors: number[], 
    type: 'panel' | 'battery'
  ): EvidenceRow[] {
    const evidence: EvidenceRow[] = [];
    
    // Try regex pattern first
    if (product.regex) {
      try {
        const regex = new RegExp(product.regex, 'gi');
        let match;
        while ((match = regex.exec(text)) !== null) {
          const context = this.getContext(text, match.index);
          const sectionBoost = this.isNearAnchor(match.index, anchors);
          
          // Basic validation - just check it's not obviously wrong type
          if (this.isValidMatch(context, type)) {
            const score = this.calculateScore(match[0], context, sectionBoost, 'regex', product, type);
            evidence.push({
              snippet: match[0],
              position: match.index,
              matchType: 'regex',
              score,
              context: context.substring(0, 150),
              sectionBoost
            });
          }
        }
      } catch (e) {
        console.warn(`⚠️ Invalid regex for ${product.brand} ${product.model}:`, e);
      }
    }
    
    // Try aliases
    for (const alias of product.aliases || []) {
      if (alias.length < 3) continue; // Skip very short aliases
      
      try {
        const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
        let match;
        while ((match = regex.exec(text)) !== null) {
          const context = this.getContext(text, match.index);
          const sectionBoost = this.isNearAnchor(match.index, anchors);
          
          if (this.isValidMatch(context, type)) {
            const score = this.calculateScore(match[0], context, sectionBoost, 'alias', product, type);
            evidence.push({
              snippet: match[0],
              position: match.index,
              matchType: 'alias',
              score,
              context: context.substring(0, 150),
              sectionBoost
            });
          }
        }
      } catch (e) {
        console.warn(`⚠️ Invalid alias regex for ${alias}:`, e);
      }
    }
    
    // Try brand + model combination
    const brandRegex = new RegExp(`\\b${product.brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    const modelParts = product.model.split(/[\s-]+/).filter(part => part.length > 2);
    
    for (const part of modelParts) {
      const partRegex = new RegExp(`\\b${part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      let brandMatch;
      while ((brandMatch = brandRegex.exec(text)) !== null) {
        const searchWindow = text.substring(brandMatch.index, brandMatch.index + 200);
        if (partRegex.test(searchWindow)) {
          const context = this.getContext(text, brandMatch.index);
          const sectionBoost = this.isNearAnchor(brandMatch.index, anchors);
          
          if (this.isValidMatch(context, type)) {
            const score = this.calculateScore(`${product.brand} ${part}`, context, sectionBoost, 'brand', product, type);
            evidence.push({
              snippet: `${product.brand} ${part}`,
              position: brandMatch.index,
              matchType: 'brand',
              score,
              context: context.substring(0, 150),
              sectionBoost
            });
          }
        }
        brandRegex.lastIndex = brandMatch.index + 1;
      }
    }
    
    return evidence
      .sort((a, b) => b.score - a.score)
      .slice(0, 3); // Top 3 pieces of evidence
  }

  private isValidMatch(context: string, type: 'panel' | 'battery'): boolean {
    if (type === 'panel') {
      // Reject if clearly a battery (has kWh)
      return !/\b\d{1,3}(?:\.\d{1,2})?\s*KWH?\b/i.test(context);
    } else {
      // Reject if clearly an inverter (has kW without kWh)
      const hasKW = /\b\d{1,2}(?:\.\d)?\s*KW\b(?!\s*H)/i.test(context);
      const hasKWH = /\b\d{1,3}(?:\.\d{1,2})?\s*KWH?\b/i.test(context);
      return !(hasKW && !hasKWH);
    }
  }

  private calculateScore(
    match: string, 
    context: string, 
    sectionBoost: boolean, 
    matchType: 'regex' | 'alias' | 'brand',
    product: CatalogueProduct,
    type: 'panel' | 'battery'
  ): number {
    let baseScore = 0.3;
    
    // Match type scoring
    if (matchType === 'regex') baseScore = 0.6;
    else if (matchType === 'alias') baseScore = 0.4;
    else if (matchType === 'brand') baseScore = 0.3;
    
    // Section boost
    if (sectionBoost) baseScore += 0.2;
    
    // Spec matching bonus
    if (type === 'panel' && product.specs.watts) {
      const wattsPattern = new RegExp(`\\b${product.specs.watts}\\s*W\\b`, 'i');
      if (wattsPattern.test(context)) baseScore += 0.3;
    }
    
    if (type === 'battery' && product.specs.kWh) {
      const kwhPattern = new RegExp(`\\b${product.specs.kWh}(?:\\.\\d)?\\s*KWH?\\b`, 'i');
      if (kwhPattern.test(context)) baseScore += 0.3;
    }
    
    return Math.min(0.99, baseScore);
  }

  private findInverters(text: string, anchors: number[]): InverterCandidate[] {
    console.log('🔍 Searching for inverters...');
    const candidates: InverterCandidate[] = [];
    
    for (const inverterBrand of INVERTER_BRANDS) {
      for (const brandPattern of inverterBrand.patterns) {
        // Look for brand followed by model pattern
        const regex = new RegExp(
          `\\b(${brandPattern})\\s+([A-Z0-9][A-Z0-9\\s-]{2,20})\\b`, 
          'gi'
        );
        
        let match;
        while ((match = regex.exec(text)) !== null) {
          const fullMatch = match[0];
          const brand = inverterBrand.brand;
          const model = fullMatch.trim();
          
          const context = this.getContext(text, match.index, 400);
          const sectionBoost = this.isNearAnchor(match.index, anchors);
          
          // Must be near an anchor and have kW rating
          if (sectionBoost) {
            const kwMatches = [...context.matchAll(/\b(\d{1,2}(?:\.\d)?)\s*KW\b(?!\s*H)/gi)];
            const kwhMatches = [...context.matchAll(/\b\d{1,3}(?:\.\d{1,2})?\s*KWH?\b/gi)];
            
            // Must have kW but not kWh (to avoid batteries)
            if (kwMatches.length > 0 && kwhMatches.length === 0) {
              const kW = parseFloat(kwMatches[0][1]);
              
              // Reasonable inverter kW range
              if (kW >= 1 && kW <= 50) {
                console.log(`⚡ Inverter found: ${brand} ${model} (${kW}kW)`);
                
                candidates.push({
                  brand,
                  model,
                  kW,
                  evidence: [{
                    snippet: fullMatch,
                    position: match.index,
                    matchType: 'regex',
                    score: 0.7 + (sectionBoost ? 0.2 : 0),
                    context: context.substring(0, 150),
                    sectionBoost
                  }],
                  totalScore: 0.7 + (sectionBoost ? 0.2 : 0)
                });
              }
            }
          }
        }
      }
    }
    
    return candidates
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 3);
  }

  private isNearAnchor(position: number, anchors: number[]): boolean {
    return anchors.some(anchor => 
      position >= anchor && position - anchor <= 1000
    );
  }

  private getContext(text: string, position: number, windowSize: number = 300): string {
    const start = Math.max(0, position - windowSize);
    const end = Math.min(text.length, position + windowSize);
    return text.substring(start, end);
  }

  private formatPanelResult(candidate: MatchCandidate) {
    return {
      brand: candidate.product.brand,
      model: candidate.product.model,
      productId: candidate.product.id,
      confidence: Math.min(0.99, candidate.totalScore),
      evidence: candidate.evidence.slice(0, 3),
      specs: { watts: candidate.product.specs.watts }
    };
  }

  private formatBatteryResult(candidate: MatchCandidate) {
    return {
      brand: candidate.product.brand,
      model: candidate.product.model,
      productId: candidate.product.id,
      confidence: Math.min(0.99, candidate.totalScore),
      evidence: candidate.evidence.slice(0, 3),
      specs: { kWh: candidate.product.specs.kWh }
    };
  }

  private formatInverterResult(candidate: InverterCandidate) {
    return {
      brand: candidate.brand,
      model: candidate.model,
      confidence: Math.min(0.99, candidate.totalScore),
      evidence: candidate.evidence.slice(0, 3),
      specs: { kW: candidate.kW }
    };
  }

  private extractSystemInfo(text: string) {
    const result: any = {};
    
    // System size
    const sizeMatch = text.match(/(\d+(?:\.\d+)?)\s*KW\s*(?:SOLAR|SYSTEM|PV)/i);
    if (sizeMatch) {
      result.systemSize = {
        value: parseFloat(sizeMatch[1]),
        unit: 'kW',
        confidence: 0.8
      };
    }
    
    // Postcode
    const postcodeMatch = text.match(/\b(\d{4})\b/);
    if (postcodeMatch && postcodeMatch[1] >= '1000' && postcodeMatch[1] <= '9999') {
      result.postcode = {
        value: postcodeMatch[1],
        confidence: 0.7
      };
    }
    
    // Total cost
    const costMatch = text.match(/\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/);
    if (costMatch) {
      const value = parseFloat(costMatch[1].replace(/,/g, ''));
      if (value > 1000 && value < 500000) {
        result.totalCost = {
          value,
          confidence: 0.6
        };
      }
    }
    
    return result;
  }
}

export const masterOCRPipeline = new MasterOCRPipeline();