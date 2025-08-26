/**
 * Hierarchical Product Matcher - Handles ALL ~2000 products
 * Priority: Brand → Wattage/kWh/kW → Model
 * 
 * This ensures perfect matching for every product:
 * - "Jinko 440" → Only Jinko 440W products → Then Tiger Neo if found
 * - "Tesla 13.5" → Only Tesla 13.5kWh → Then Powerwall model
 * - "Goodwe 6" → Only Goodwe 6kW → Then specific inverter model
 */

import { Product, MatchHit } from './smartMatcher';
import { brandStrictFilter } from './brandStrictFilter';

export interface HierarchicalMatch {
  product: Product;
  confidence: number;
  matchType: 'exact_brand_spec_model' | 'exact_brand_spec' | 'brand_fuzzy_spec' | 'brand_only';
  evidence: {
    brandMatch: boolean;
    specMatch: boolean;
    modelMatch: boolean;
    contextBonus: number;
  };
  raw: string;
  position: number;
}

// Enhanced brand-specific regex patterns for ALL major brands
const BRAND_SPECIFIC_PATTERNS: Record<string, { panel?: RegExp; battery?: RegExp; inverter?: RegExp }> = {
  // PANELS - Detailed patterns for every brand
  JINKO: {
    panel: /\bJKM[-\s]?\d{3,4}[A-Z]{1,2}[-\s]?\d{2}[A-Z]{2,4}[-\s]?[A-Z0-9]*\b/gi
  },
  "JINKO SOLAR": {
    panel: /\bJKM[-\s]?\d{3,4}[A-Z]{1,2}[-\s]?\d{2}[A-Z]{2,4}[-\s]?[A-Z0-9]*\b/gi
  },
  TRINA: {
    panel: /\bTSM[-\s]?\d{3,4}[A-Z]{2,4}\d?[A-Z]?(?:\.?\d{2})?\b/gi
  },
  "TRINA SOLAR": {
    panel: /\bTSM[-\s]?\d{3,4}[A-Z]{2,4}\d?[A-Z]?(?:\.?\d{2})?\b/gi
  },
  LONGI: {
    panel: /\bLR\d[-\s]?\d{2}[A-Z]{2,4}[-\s]?\d{3,4}[A-Z]?\b/gi
  },
  "LONGI SOLAR": {
    panel: /\bLR\d[-\s]?\d{2}[A-Z]{2,4}[-\s]?\d{3,4}[A-Z]?\b/gi
  },
  "JA SOLAR": {
    panel: /\bJAM\d{2}[A-Z]\d{2}[-\s]?\d{3,4}\/[A-Z]{2}\b/gi
  },
  "CANADIAN SOLAR": {
    panel: /\bCS\d[A-Z]?[-\s]?\d{3,4}[A-Z]{2}\b/gi
  },
  QCELLS: {
    panel: /\bQ\.(?:PEAK|MAXX)[-\s]?[A-Z]{2,4}[-\s]?\d{3,4}\b/gi
  },
  "HANWHA Q CELLS": {
    panel: /\bQ\.(?:PEAK|MAXX)[-\s]?[A-Z]{2,4}[-\s]?\d{3,4}\b/gi
  },
  REC: {
    panel: /\bREC\d{3}[A-Z]{2}[-\s]?\d{3,4}[A-Z]?\b/gi
  },
  "REC SOLAR": {
    panel: /\bREC\d{3}[A-Z]{2}[-\s]?\d{3,4}[A-Z]?\b/gi
  },
  MAXEON: {
    panel: /\bSPR[-\s]?[A-Z]?\d{3,4}[-\s]?[A-Z]{2,4}\b/gi
  },
  SUNPOWER: {
    panel: /\bSPR[-\s]?[A-Z]?\d{3,4}[-\s]?[A-Z]{2,4}\b/gi
  },
  EGING: {
    panel: /\bEG[-\s]?\d{3,4}[A-Z]{2,6}[-\s]?(?:HL|BL|BF|DG|MG)(?:[-/\s]?[A-Z]{2})*\b/gi
  },
  "EGING PV": {
    panel: /\bEG[-\s]?\d{3,4}[A-Z]{2,6}[-\s]?(?:HL|BL|BF|DG|MG)(?:[-/\s]?[A-Z]{2})*\b/gi
  },

  // BATTERIES - Detailed patterns for every brand
  TESLA: {
    battery: /\b(?:TESLA\s+)?POWERWALL\s*(?:2|3|\+)?\s*(?:\d{1,2}(?:\.\d)?\s*kWh?)?\b/gi
  },
  BYD: {
    battery: /\bBYD\s+(?:BATTERY[-\s]?BOX\s+)?(?:PREMIUM\s+)?(?:HVM|HVS)\s*\d{1,2}(?:\.\d)?\b/gi
  },
  GOODWE_BATTERY: {
    battery: /\b(?:LX|LYNX)[-\s]?F[-\s]?\d{1,2}(?:\.\d)?[-\s]?H[-\s]?\d{2}\b/gi
  },
  SUNGROW_BATTERY: {
    battery: /\bSBR\s*\d{3}(?:\s*\d{1,2}(?:\.\d)?\s*kWh?)?\b/gi
  },
  ALPHAESS: {
    battery: /\b(?:ALPHA\s+)?SMILE[-\s]?[A-Z0-9+]+\s*(?:\d{1,2}(?:\.\d)?\s*kWh?)?\b/gi
  },
  PYLONTECH: {
    battery: /\bUS\d{4}[A-Z]?\s*(?:\d{1,2}(?:\.\d)?\s*kWh?)?\b/gi
  },
  SOLAREDGE_BATTERY: {
    battery: /\b(?:SOLAREDGE\s+)?(?:ENERGY\s+BANK|HOME\s+BATTERY)\s*\d{1,2}(?:\.\d)?\s*kWh?\b/gi
  },
  ENPHASE: {
    battery: /\bIQ\s+BATTERY\s+\d{1,2}[A-Z]?\s*(?:\d{1,2}(?:\.\d)?\s*kWh?)?\b/gi
  },

  // INVERTERS - Detailed patterns for every brand  
  GOODWE_INVERTER: {
    inverter: /\bGW[-\s]?\d{4,5}K?[-\s]?(?:EH|ET|ES|MS|NS|XS|DNS|EMS|EMT|XSA|XNA|DT)\b/gi
  },
  SUNGROW_INVERTER: {
    inverter: /\bS[GH][-\s]?\d{1,2}(?:\.\d)?[A-Z]{1,3}\b/gi
  },
  SOLAREDGE_INVERTER: {
    inverter: /\bSE\d{4,5}[A-Z]?\b/gi
  },
  FRONIUS: {
    inverter: /\b(?:PRIMO|SYMO)\s+\d{1,2}(?:\.\d)?[-\s]?[13](?:[-\s]?[A-Z])?\b/gi
  },
  SMA: {
    inverter: /\bSB\s?\d{1,2}(?:\.\d)?[-\s]?[A-Z0-9]{2,4}\b/gi
  },
  GROWATT: {
    inverter: /\b(?:MIN|MAX|MID|MOD)[-\s]?\d{3,5}[A-Z]{1,3}\b/gi
  }
};

export class HierarchicalMatcher {
  private allProducts: Product[];

  constructor(products: Product[]) {
    this.allProducts = products;
  }

  /**
   * Main matching function - uses brand-specific patterns + hierarchical fallback
   */
  match(text: string): HierarchicalMatch[] {
    const normalizedText = text.toUpperCase();
    const results: HierarchicalMatch[] = [];
    
    // STEP 1: Use brand-specific patterns (like Eging has)
    results.push(...this.matchWithBrandSpecificPatterns(normalizedText));
    
    // STEP 2: Use general hierarchical patterns for missed items
    results.push(...this.matchWithGeneralPatterns(normalizedText));
    
    // Remove duplicates and sort by confidence
    const uniqueResults = this.deduplicateMatches(results);
    return uniqueResults.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Use detailed brand-specific regex patterns (gives Jinko same treatment as Eging)
   */
  private matchWithBrandSpecificPatterns(text: string): HierarchicalMatch[] {
    const results: HierarchicalMatch[] = [];
    
    for (const [brandKey, patterns] of Object.entries(BRAND_SPECIFIC_PATTERNS)) {
      for (const [type, pattern] of Object.entries(patterns)) {
        if (!pattern) continue;
        
        let match;
        while ((match = pattern.exec(text)) !== null) {
          const fullMatch = match[0];
          
          // Find products for this brand and type
          const normalizedBrand = brandKey.replace(/_BATTERY|_INVERTER|_PANEL/g, '');
          const brandProducts = this.allProducts.filter(p => 
            (p.brand.toUpperCase() === normalizedBrand || 
             p.brand.toUpperCase().includes(normalizedBrand) ||
             normalizedBrand.includes(p.brand.toUpperCase())) &&
            p.type === type
          );
          
          if (brandProducts.length > 0) {
            const contextWindow = this.getContext(text, match.index!);
            const bestMatch = this.findBestModel(brandProducts, contextWindow, fullMatch);
            bestMatch.position = match.index!;
            bestMatch.confidence = Math.min(0.95, bestMatch.confidence + 0.15); // Boost for specific pattern match
            
            results.push(bestMatch);
          }
        }
      }
    }
    
    return results;
  }

  /**
   * General hierarchical patterns (fallback for brands without specific patterns)
   */
  private matchWithGeneralPatterns(text: string): HierarchicalMatch[] {
    const results: HierarchicalMatch[] = [];
    
    // Extract ALL possible brand+spec combinations
    const patterns = this.generateAllPatterns();
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.regex.exec(text)) !== null) {
        const brandRaw = match[1] || 'UNKNOWN';
        const specRaw = match[2] || match[0];
        const fullMatch = match[0];
        
        if (!brandRaw || brandRaw === 'UNKNOWN') continue;
        
        // Get exact brand+spec matches using strict filter
        const searchQuery = this.buildSearchQuery(brandRaw, specRaw, pattern.type);
        const strictResult = brandStrictFilter.filterProducts(this.allProducts, searchQuery);
        
        if (strictResult.filteredProducts.length > 0) {
          const contextWindow = this.getContext(text, match.index!);
          const bestMatch = this.findBestModel(strictResult.filteredProducts, contextWindow, fullMatch);
          bestMatch.position = match.index!;
          
          results.push(bestMatch);
        } else if (pattern.type === 'battery') {
          // Enhanced battery fallback with capacity extraction
          const brandOnlyResult = brandStrictFilter.filterProducts(this.allProducts, brandRaw);
          if (brandOnlyResult.filteredProducts.length > 0) {
            const contextWindow = this.getContext(text, match.index!);
            const bestMatch = this.findBestModelWithCapacity(brandOnlyResult.filteredProducts, contextWindow, fullMatch);
            bestMatch.confidence = Math.max(0.5, bestMatch.confidence - 0.1);
            bestMatch.position = match.index!;
            
            results.push(bestMatch);
          }
        }
      }
    }
    
    return results;
  }

  /**
   * Enhanced battery model finder with accurate capacity extraction
   */
  private findBestModelWithCapacity(candidates: Product[], context: string, rawMatch: string): HierarchicalMatch {
    // Extract capacity from context more accurately - support up to 100kWh batteries
    const capacityPatterns = [
      /(\d{1,3}(?:\.\d{1,2})?)\s*kWh/i,  // Support 1-100kWh (was 1-12)
      /(\d{1,3}(?:\.\d{1,2})?)\s*kwh/i,
      /(\d{1,3}(?:\.\d{1,2})?)\s*KWH/i,
      /LYNX[-\s]?F[-\s]?(\d{1,3}(?:\.\d)?)/i,  // Goodwe Lynx F12.8
      /SBR(\d{2,3})/i,  // Sungrow SBR096 → 9.6kWh
      /HVM[-\s]?(\d{1,3}(?:\.\d)?)/i,  // BYD HVM 16.6
      /HVS[-\s]?(\d{1,3}(?:\.\d)?)/i,  // BYD HVS 10.2
      /POWERWALL[-\s]?(\d)/i,  // Tesla Powerwall 2/3
      /SIGENERGY\s+(\d{1,3}(?:\.\d{1,2})?)/i,  // Sigenergy 32.4kWh
      /(\d{1,3}(?:\.\d{1,2})?)\s*kWh?\s*(?:battery|storage|batt)/i  // 32kWh battery
    ];
    
    let extractedCapacity: number | undefined;
    
    for (const pattern of capacityPatterns) {
      const match = pattern.exec(context);
      if (match) {
        const value = parseFloat(match[1]);
        if (pattern.source.includes('SBR')) {
          // Sungrow SBR pattern: 096 → 9.6kWh
          extractedCapacity = value / 10;
        } else if (pattern.source.includes('POWERWALL')) {
          // Tesla Powerwall: 2 → 13.5kWh, 3 → 13.5kWh
          extractedCapacity = value === 2 ? 13.5 : value === 3 ? 13.5 : 13.5;
        } else {
          extractedCapacity = value;
        }
        break;
      }
    }
    
    // Find best matching product by capacity
    let bestProduct = candidates[0];
    let bestConfidence = 0.6;
    let modelFound = false;
    
    if (extractedCapacity) {
      for (const product of candidates) {
        const productCapacity = product.capacity_kwh || product.specs?.usable_kWh || 0;
        
        if (Math.abs(productCapacity - extractedCapacity) < 0.2) {
          bestProduct = product;
          bestConfidence = 0.85; // High confidence for capacity match
          modelFound = true;
          break;
        }
      }
    }
    
    // Model name matching as fallback
    if (!modelFound) {
      const modelTokens = this.extractModelTokens(rawMatch);
      for (const product of candidates) {
        const productTokens = this.extractModelTokens(product.model);
        let matches = 0;
        
        for (const token of modelTokens) {
          if (productTokens.some(pToken => pToken.toUpperCase().includes(token.toUpperCase()))) {
            matches++;
          }
        }
        
        if (matches > 0) {
          const confidence = 0.6 + (matches * 0.1);
          if (confidence > bestConfidence) {
            bestProduct = product;
            bestConfidence = confidence;
            modelFound = true;
          }
        }
      }
    }
    
    return {
      product: bestProduct,
      confidence: bestConfidence,
      matchType: modelFound && bestConfidence >= 0.8 ? 'exact_brand_spec_model' : 'exact_brand_spec',
      evidence: {
        brandMatch: true,
        specMatch: !!extractedCapacity,
        modelMatch: modelFound,
        contextBonus: Math.max(0, bestConfidence - 0.6)
      },
      raw: rawMatch,
      position: 0
    };
  }

  /**
   * Generate regex patterns for ALL products in database
   */
  private generateAllPatterns(): Array<{regex: RegExp, type: 'panel' | 'battery' | 'inverter'}> {
    const allBrands = [...new Set(this.allProducts.map(p => p.brand.toUpperCase()))];
    const patterns: Array<{regex: RegExp, type: 'panel' | 'battery' | 'inverter'}> = [];
    
    // Create brand alternatives string for regex
    const brandPattern = allBrands
      .map(brand => brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) // Escape regex chars
      .join('|');
    
    // Panel patterns: Brand + Watts (100-700W range) - More lenient matching
    patterns.push({
      regex: new RegExp(`\\b(${brandPattern})\\s*[-\\s]*([\\w\\d]+)\\s*(\\d{3,4})W?\\b`, 'gi'),
      type: 'panel'
    });
    
    // Additional panel pattern: Just Brand + Watts without model
    patterns.push({
      regex: new RegExp(`\\b(${brandPattern})\\s+(\\d{3,4})W?\\b`, 'gi'),
      type: 'panel'
    });
    
    // Enhanced Battery patterns - Multiple formats to catch all battery mentions
    // Pattern 1: Brand + Capacity (Tesla 13.5, BYD 10, Sigenergy 32, etc.)
    patterns.push({
      regex: new RegExp(`\\b(${brandPattern})\\s+(\\d{1,3}(?:\\.\\d{1,2})?)(?:\\s*kWh?)?\\b`, 'gi'),
      type: 'battery'
    });
    
    // Pattern 2: Brand + Model + Capacity (Tesla Powerwall 2, BYD HVM 16.6, etc.)
    patterns.push({
      regex: new RegExp(`\\b(${brandPattern})\\s+(?:powerwall|lynx|hvm|hvs|sbr|iq|alpha|smile)\\s*(?:\\d+(?:\\.\\d)?)?`, 'gi'),
      type: 'battery'
    });
    
    // Pattern 3: Standalone capacity with battery context (13.5kWh Battery, 32kWh Storage)
    patterns.push({
      regex: new RegExp(`\\b(\\d{1,3}(?:\\.\\d{1,2})?)\\s*kWh?\\s*(?:battery|storage|batt)`, 'gi'),
      type: 'battery'
    });
    
    // Pattern 4: Common battery model names with brands
    const batteryModels = ['powerwall', 'lynx', 'hvm', 'hvs', 'sbr', 'alpha', 'smile', 'encharge', 'sigenergy', 'pylon'];
    for (const model of batteryModels) {
      patterns.push({
        regex: new RegExp(`\\b(${brandPattern})?\\s*(${model})\\s*(?:\\d+(?:\\.\\d)?)?`, 'gi'),
        type: 'battery'
      });
    }
    
    // Inverter patterns: Brand + kW (1-50 kW range)
    patterns.push({
      regex: new RegExp(`\\b(${brandPattern})\\s+(\\d{1,2}(?:\\.\\d)?)\\s*KW\\b`, 'gi'),
      type: 'inverter'
    });
    
    return patterns;
  }

  /**
   * Build search query for strict filtering
   */
  private buildSearchQuery(brand: string, spec: string, type: 'panel' | 'battery' | 'inverter'): string {
    // Clean up brand and spec
    const cleanBrand = brand.replace(/[^\w\s]/g, '').trim();
    const cleanSpec = spec.replace(/[^\d.]/g, '');
    
    switch (type) {
      case 'panel':
        if (cleanSpec && parseFloat(cleanSpec) >= 100) {
          return `${cleanBrand} ${cleanSpec}W`;
        }
        return cleanBrand;
      case 'battery':
        if (cleanSpec && parseFloat(cleanSpec) <= 200) {  // Support up to 200kWh commercial batteries
          return `${cleanBrand} ${cleanSpec}kWh`;
        }
        return cleanBrand; // For cases like "Tesla Powerwall" without explicit capacity
      case 'inverter':
        if (cleanSpec && parseFloat(cleanSpec) <= 50) {
          return `${cleanBrand} ${cleanSpec}kW`;
        }
        return cleanBrand;
      default:
        return cleanBrand;
    }
  }

  /**
   * Find the best model within exact brand+spec matches
   */
  private findBestModel(candidates: Product[], context: string, rawMatch: string): HierarchicalMatch {
    let bestProduct = candidates[0]; // Default to first exact match
    let bestConfidence = 0.7; // Base confidence for brand+spec match
    let modelFound = false;
    
    // Try to find model-specific keywords in context
    for (const product of candidates) {
      const modelTokens = this.extractModelTokens(product.model);
      let modelScore = 0;
      let foundTokens = 0;
      
      for (const token of modelTokens) {
        if (token.length >= 3 && context.includes(token.toUpperCase())) {
          modelScore += this.getTokenWeight(token);
          foundTokens++;
        }
      }
      
      if (foundTokens > 0) {
        const totalConfidence = 0.7 + Math.min(modelScore, 0.3); // Cap model bonus at 0.3
        
        if (totalConfidence > bestConfidence) {
          bestProduct = product;
          bestConfidence = totalConfidence;
          modelFound = true;
        }
      }
    }
    
    // Determine match type
    let matchType: HierarchicalMatch['matchType'];
    if (modelFound && bestConfidence >= 0.85) {
      matchType = 'exact_brand_spec_model';
    } else if (bestConfidence >= 0.7) {
      matchType = 'exact_brand_spec';
    } else if (bestConfidence >= 0.5) {
      matchType = 'brand_fuzzy_spec';
    } else {
      matchType = 'brand_only';
    }
    
    return {
      product: bestProduct,
      confidence: bestConfidence,
      matchType,
      evidence: {
        brandMatch: true,
        specMatch: bestConfidence >= 0.7,
        modelMatch: modelFound,
        contextBonus: bestConfidence - 0.7
      },
      raw: rawMatch,
      position: 0 // Will be set by caller
    };
  }

  /**
   * Extract meaningful tokens from product model
   */
  private extractModelTokens(model: string): string[] {
    // Split on common separators and filter meaningful tokens
    const tokens = model.split(/[\s\-_/]+/)
      .filter(token => token.length >= 2)
      .filter(token => !/^\d+$/.test(token)) // Skip pure numbers (handled by spec matching)
      .filter(token => token.toUpperCase() !== 'SOLAR'); // Skip generic words
    
    // Add common battery model variations
    const upperModel = model.toUpperCase();
    const batteryVariants = [];
    
    if (upperModel.includes('POWERWALL')) {
      batteryVariants.push('POWERWALL', 'PW', 'TESLA');
    }
    if (upperModel.includes('LYNX')) {
      batteryVariants.push('LYNX', 'F12', 'F10', 'GOODWE');
    }
    if (upperModel.includes('HVM') || upperModel.includes('HVS')) {
      batteryVariants.push('HVM', 'HVS', 'BYD', 'BATTERY-BOX');
    }
    if (upperModel.includes('SBR')) {
      batteryVariants.push('SBR', 'SUNGROW');
    }
    if (upperModel.includes('ALPHA')) {
      batteryVariants.push('ALPHA', 'SMILE', 'ALPHAESS');
    }
    
    return [...tokens, ...batteryVariants];
  }

  /**
   * Get weight for model token based on significance
   */
  private getTokenWeight(token: string): number {
    const upper = token.toUpperCase();
    
    // High-value model indicators (including battery models)
    if (/^(TIGER|NEO|VERTEX|ALPHA|POWERWALL|LYNX|HONEY|DUOMAX|PEAK|MAXX|HVM|HVS|SBR|SMILE|ENCHARGE)$/i.test(upper)) {
      return 0.15;
    }
    
    // Medium-value indicators (including battery codes)
    if (/^(HL4|HC|DT|EH|ET|RS|IQ|SG|GW|F12|F10|PW|PYLON|BOX)$/i.test(upper)) {
      return 0.10;
    }
    
    // Battery-specific indicators
    if (/^(BATTERY|STORAGE|BATT|KWH|LITHIUM|LFP|LIFEPO4)$/i.test(upper)) {
      return 0.08;
    }
    
    // Low-value but still meaningful
    if (token.length >= 4) {
      return 0.05;
    }
    
    return 0.03;
  }

  /**
   * Get context window around match
   */
  private getContext(text: string, position: number, windowSize: number = 150): string {
    const start = Math.max(0, position - windowSize);
    const end = Math.min(text.length, position + windowSize);
    return text.slice(start, end);
  }

  /**
   * Remove duplicate matches (same product found multiple times)
   */
  private deduplicateMatches(matches: HierarchicalMatch[]): HierarchicalMatch[] {
    const seen = new Set<string>();
    const unique: HierarchicalMatch[] = [];
    
    for (const match of matches) {
      const key = `${match.product.id}-${match.raw}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(match);
      }
    }
    
    return unique;
  }

  /**
   * Convert hierarchical matches to MatchHit format for compatibility
   */
  convertToMatchHits(hierarchicalMatches: HierarchicalMatch[]): MatchHit[] {
    return hierarchicalMatches.map(hm => ({
      productId: hm.product.id,
      product: hm.product,
      score: hm.confidence,
      evidence: {
        regexHit: hm.matchType.includes('exact'),
        aliasHit: false,
        sectionBoost: 0,
        qtyBoost: 0,
        brandNearby: hm.evidence.brandMatch,
        specNearby: hm.evidence.specMatch,
        ocrRiskPenalty: 0
      },
      at: hm.position,
      raw: hm.raw
    }));
  }
}

/**
 * Factory function to create hierarchical matcher
 */
export function createHierarchicalMatcher(products: Product[]): HierarchicalMatcher {
  return new HierarchicalMatcher(products);
}