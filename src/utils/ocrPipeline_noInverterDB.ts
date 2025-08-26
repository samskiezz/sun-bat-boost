import { catalogueClient, CatalogueProduct, INVERTER_BRANDS } from './catalogClient';
import { pdfExtractor, ExtractedContent } from './pdfExtract';

export interface EvidenceRow {
  snippet: string;
  position: number;
  matchType: 'regex' | 'alias';
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
  // Additional system information
  systemSize?: {
    value: number;
    unit: string;
    confidence: number;
  };
  totalCost?: {
    value: number;
    confidence: number;
  };
  postcode?: {
    value: string;
    confidence: number;
  };
  installer?: {
    name: string;
    confidence: number;
  };
}

interface MatchCandidate {
  product: CatalogueProduct;
  evidence: EvidenceRow[];
  totalScore: number;
  regexHits: number;
  aliasHits: number;
}

interface InverterCandidate {
  brand: string;
  model: string;
  kW?: number;
  evidence: EvidenceRow[];
  totalScore: number;
}

export class UniversalOCRPipeline {
  private anchors = [
    'YOUR SOLUTION',
    'QUOTATION',
    'SYSTEM COMPONENTS', 
    'INCLUSIONS',
    'EQUIPMENT',
    'SOLAR PANELS',
    'BATTERY STORAGE',
    'INVERTER'
  ];

  async process(file: File): Promise<OCRResult> {
    console.log('🚀 Starting Universal OCR Pipeline...');
    const startTime = Date.now();
    
    // Initialize clients
    await catalogueClient.init();
    
    // Extract content
    const content = await pdfExtractor.extractFromFile(file);
    console.log(`📄 Extracted ${content.text.length} characters via ${content.method}`);
    
    // Find anchor positions for section weighting
    const anchorPositions = this.findAnchors(content.text);
    console.log(`⚓ Found ${anchorPositions.length} section anchors`);
    
    // Match panels and batteries using database
    const panels = this.matchProducts(content.text, catalogueClient.getPanels(), anchorPositions, 'panel');
    const batteries = this.matchProducts(content.text, catalogueClient.getBatteries(), anchorPositions, 'battery');
    
    // Match inverters (no DB)
    const inverters = this.matchInverters(content.text, anchorPositions);
    
    // Extract additional system information
    const systemInfo = this.extractAdditionalData(content.text);
    
    const processingTime = Date.now() - startTime;
    console.log(`✅ Pipeline complete in ${processingTime}ms`);
    console.log(`🎯 Found: ${panels.length} panels, ${batteries.length} batteries, ${inverters.length} inverters`);
    
    return {
      panels: panels.map(p => ({
        brand: p.product.brand,
        model: p.product.model,
        productId: p.product.id,
        confidence: Math.min(0.99, p.totalScore),
        evidence: p.evidence.slice(0, 3), // Top 3 evidence
        specs: { watts: p.product.specs.watts }
      })),
      batteries: batteries.map(b => ({
        brand: b.product.brand,
        model: b.product.model,
        productId: b.product.id,
        confidence: Math.min(0.99, b.totalScore),
        evidence: b.evidence.slice(0, 3),
        specs: { kWh: b.product.specs.kWh }
      })),
      inverters: inverters.map(i => ({
        brand: i.brand,
        model: i.model,
        confidence: Math.min(0.99, i.totalScore),
        evidence: i.evidence.slice(0, 3),
        specs: { kW: i.kW }
      })),
      // Include system information
      systemSize: systemInfo.systemSize,
      totalCost: systemInfo.totalCost,
      postcode: systemInfo.postcode,
      installer: systemInfo.installer
    };
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

  private matchProducts(
    text: string, 
    products: CatalogueProduct[], 
    anchorPositions: number[], 
    type: 'panel' | 'battery'
  ): MatchCandidate[] {
    console.log(`🔍 Matching ${products.length} ${type}s...`);
    
    const candidates = new Map<string, MatchCandidate>();
    
    for (const product of products) {
      const key = `${product.brand}|${product.model}`;
      
      if (!candidates.has(key)) {
        candidates.set(key, {
          product,
          evidence: [],
          totalScore: 0,
          regexHits: 0,
          aliasHits: 0
        });
      }
      
      const candidate = candidates.get(key)!;
      
      // Test regex pattern
      const regexMatches = this.findMatches(text, new RegExp(product.regex, 'gi'));
      for (const match of regexMatches) {
        if (this.validateMatch(match, product, type, text)) {
          const sectionBoost = this.isNearAnchor(match.position, anchorPositions);
          const score = 0.50 + (sectionBoost ? 0.25 : 0) + (this.hasSpecMatch(match, product, type, text) ? 0.15 : 0);
          
          candidate.evidence.push({
            snippet: match.text,
            position: match.position,
            matchType: 'regex',
            score,
            context: this.getContext(text, match.position),
            sectionBoost
          });
          candidate.regexHits++;
        }
      }
      
      // Test aliases
      for (const alias of product.aliases) {
        const aliasMatches = this.findMatches(text, new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'));
        for (const match of aliasMatches) {
          if (this.validateMatch(match, product, type, text)) {
            const sectionBoost = this.isNearAnchor(match.position, anchorPositions);
            const score = 0.35 + (sectionBoost ? 0.25 : 0) + (this.hasSpecMatch(match, product, type, text) ? 0.15 : 0);
            
            candidate.evidence.push({
              snippet: match.text,
              position: match.position,
              matchType: 'alias',
              score,
              context: this.getContext(text, match.position),
              sectionBoost
            });
            candidate.aliasHits++;
          }
        }
      }
      
      // Calculate total score
      candidate.totalScore = candidate.evidence.reduce((sum, e) => sum + e.score, 0) / Math.max(1, candidate.evidence.length);
    }
    
    // Filter and sort by voting rules
    const validCandidates = Array.from(candidates.values()).filter(c => {
      return c.totalScore >= 0.70 && (c.regexHits >= 1 || c.aliasHits >= 2);
    });
    
    return validCandidates
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 3); // Top 3
  }

  private findMatches(text: string, regex: RegExp): Array<{ text: string; position: number }> {
    const matches: Array<{ text: string; position: number }> = [];
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        text: match[0],
        position: match.index
      });
    }
    
    return matches;
  }

  private validateMatch(
    match: { text: string; position: number }, 
    product: CatalogueProduct, 
    type: 'panel' | 'battery', 
    fullText: string
  ): boolean {
    const context = this.getContext(fullText, match.position, 300);
    
    if (type === 'panel') {
      // Enhanced panel detection: Look for both watts and kW patterns
      const wattsPatterns = [
        /\b(\d{3,4})\s*W\b/gi,           // 400W, 450W etc
        /\b(\d{1,2}\.?\d*)\s*kW\b/gi     // 6.6kW, 13.2kW etc (convert to watts)
      ];
      
      let foundWatts = 0;
      for (const pattern of wattsPatterns) {
        const matches = [...context.matchAll(pattern)];
        if (matches.length > 0) {
          if (pattern.source.includes('kW')) {
            // Convert kW to watts
            foundWatts = parseFloat(matches[0][1]) * 1000;
          } else {
            foundWatts = parseInt(matches[0][1]);
          }
          break;
        }
      }
      
      if (foundWatts === 0) return false;
      
      const expectedWatts = product.specs.watts;
      if (expectedWatts && Math.abs(foundWatts - expectedWatts) > 50) return false; // More tolerance for kW conversions
      
      // If product has cell group, enforce match
      if (product.specs.cellGroup) {
        const cellPattern = new RegExp(`-${product.specs.cellGroup}-`, 'i');
        if (!cellPattern.test(context)) return false;
      }
    }
    
    if (type === 'battery') {
      // Enhanced battery detection: Multiple kWh patterns
      const kwhPatterns = [
        /\b(\d{1,3}(?:\.\d{1,2})?)\s*kWh?\b/gi,    // 25kWh, 13.5kwh
        /\b(\d{1,3}(?:\.\d{1,2})?)\s*KWH?\b/gi,    // 25KWH, 13.5KWH
        /(\d{1,3}(?:\.\d{1,2})?)\s*(?:kilo\s*watt?\s*hour|kilowatt\s*hour)/gi
      ];
      
      let foundKwh = 0;
      for (const pattern of kwhPatterns) {
        const matches = [...context.matchAll(pattern)];
        if (matches.length > 0) {
          foundKwh = parseFloat(matches[0][1]);
          break;
        }
      }
      
      if (foundKwh === 0) return false;
      
      const expectedKwh = product.specs.kWh;
      if (expectedKwh) {
        const tolerance = Math.max(1.0, expectedKwh * 0.15); // More tolerance: ±15% or 1kWh minimum
        if (Math.abs(foundKwh - expectedKwh) > tolerance) return false;
      }
    }
    
    return true;
  }

  private matchInverters(text: string, anchorPositions: number[]): InverterCandidate[] {
    console.log('🔍 Matching inverters (no DB)...');
    
    const candidates: InverterCandidate[] = [];
    
    for (const inverterBrand of INVERTER_BRANDS) {
      for (const pattern of inverterBrand.patterns) {
        // More specific inverter pattern - avoid catching batteries
        const modelRegex = new RegExp(`\\b${pattern}\\s*([A-Z]{2,}[A-Z0-9]*(?:[ -]?[A-Z]{2,}|[ -]?\\d{2,4}[A-Z]{2,})[A-Z0-9-]{0,8})\\b`, 'gi');
        
        const matches = this.findMatches(text, modelRegex);
        
        for (const match of matches) {
          // Skip if this looks like a battery capacity (just a number like "25")
          const modelPart = match.text.replace(pattern, '').trim();
          if (/^\d{1,3}$/.test(modelPart)) {
            console.log(`🚫 Skipping "${match.text}" - looks like battery capacity`);
            continue;
          }
          
          if (this.isNearAnchor(match.position, anchorPositions)) {
            const context = this.getContext(text, match.position, 360);
            
            // Must have kW within same window AND not have kWh (to avoid batteries)
            const kwPattern = /\b(\d{1,2}(?:\.\d{1,2})?)\s*KW\b/gi;
            const kwhPattern = /\b(\d{1,3}(?:\.\d{1,2})?)\s*kWh?\b/gi;
            
            const kwMatches = [...context.matchAll(kwPattern)];
            const kwhMatches = [...context.matchAll(kwhPattern)];
            
            // Skip if we find kWh patterns (likely a battery)
            if (kwhMatches.length > 0) {
              console.log(`🚫 Skipping "${match.text}" - found kWh pattern (battery)`);
              continue;
            }
            
            if (kwMatches.length > 0) {
              const kW = parseFloat(kwMatches[0][1]);
              const sectionBoost = this.isNearAnchor(match.position, anchorPositions);
              const score = 0.6 + Math.min(0.4, (sectionBoost ? 0.25 : 0) + 0.15);
              
              candidates.push({
                brand: inverterBrand.brand,
                model: match.text.trim(),
                kW,
                evidence: [{
                  snippet: match.text,
                  position: match.position,
                  matchType: 'regex',
                  score,
                  context: this.getContext(text, match.position),
                  sectionBoost
                }],
                totalScore: score
              });
            }
          }
        }
      }
    }
    
    return candidates
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 2); // Top 2
  }

  private isNearAnchor(position: number, anchorPositions: number[]): boolean {
    return anchorPositions.some(anchor => 
      position > anchor && position - anchor <= 1500
    );
  }

  private hasSpecMatch(
    match: { text: string; position: number }, 
    product: CatalogueProduct, 
    type: 'panel' | 'battery', 
    fullText: string
  ): boolean {
    const context = this.getContext(fullText, match.position, 300);
    
    if (type === 'panel' && product.specs.watts) {
      // Check for both watts and kW patterns
      const wattsPatterns = [
        new RegExp(`\\b${product.specs.watts}\\s*W\\b`, 'i'),
        new RegExp(`\\b${(product.specs.watts / 1000).toFixed(1)}\\s*kW\\b`, 'i')
      ];
      
      return wattsPatterns.some(pattern => pattern.test(context));
    }
    
    if (type === 'battery' && product.specs.kWh) {
      // More flexible kWh pattern matching
      const kwhPatterns = [
        new RegExp(`\\b${product.specs.kWh}\\s*kWh?\\b`, 'i'),
        new RegExp(`\\b${product.specs.kWh}\\s*KWH?\\b`, 'i')
      ];
      
      return kwhPatterns.some(pattern => pattern.test(context));
    }
    
    return false;
  }

  private getContext(text: string, position: number, windowSize: number = 200): string {
    const start = Math.max(0, position - windowSize);
    const end = Math.min(text.length, position + windowSize);
    return text.substring(start, end);
  }

  private extractAdditionalData(text: string): {
    systemSize?: { value: number; unit: string; confidence: number };
    totalCost?: { value: number; confidence: number };
    postcode?: { value: string; confidence: number };
    installer?: { name: string; confidence: number };
  } {
    const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
    const result: any = {};
    
    // Extract system size with enhanced patterns
    const systemSizePatterns = [
      /(\d+(?:\.\d+)?)\s*kW\s*(?:of\s*)?(?:solar\s*)?(?:power|system|capacity|install)/gi,
      /(?:system\s*size|solar\s*capacity):\s*(\d+(?:\.\d+)?)\s*kW/gi,
      /(\d+(?:\.\d+)?)\s*kW\s*PV\s*system/gi
    ];
    
    for (const line of lines) {
      for (const pattern of systemSizePatterns) {
        pattern.lastIndex = 0; // Reset regex state
        const match = pattern.exec(line);
        if (match) {
          result.systemSize = {
            value: parseFloat(match[1]),
            unit: 'kW',
            confidence: 0.9
          };
          break;
        }
      }
      if (result.systemSize) break;
    }
    
    // Extract postcode
    const postcodePattern = /\b(\d{4})\b/g;
    for (const line of lines) {
      postcodePattern.lastIndex = 0;
      const matches = [...line.matchAll(postcodePattern)];
      for (const match of matches) {
        const postcode = match[1];
        if (postcode >= '1000' && postcode <= '9999') {
          result.postcode = {
            value: postcode,
            confidence: 0.8
          };
          break;
        }
      }
      if (result.postcode) break;
    }

    // Extract total cost
    const costPatterns = [
      /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi,
      /total[:\s]+\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi
    ];
    
    for (const line of lines) {
      for (const pattern of costPatterns) {
        pattern.lastIndex = 0;
        const match = pattern.exec(line);
        if (match) {
          const value = parseFloat(match[1].replace(/,/g, ''));
          if (value > 1000 && value < 500000) { // Reasonable solar system cost range
            result.totalCost = {
              value,
              confidence: 0.7
            };
            break;
          }
        }
      }
      if (result.totalCost) break;
    }

    return result;
  }
}

export const universalOCRPipeline = new UniversalOCRPipeline();