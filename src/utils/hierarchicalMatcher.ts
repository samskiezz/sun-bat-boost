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

export class HierarchicalMatcher {
  private allProducts: Product[];

  constructor(products: Product[]) {
    this.allProducts = products;
    // Removed verbose logging - keep it clean for users
  }

  /**
   * Main matching function - processes text hierarchically for ALL products
   */
  match(text: string): HierarchicalMatch[] {
    const normalizedText = text.toUpperCase();
    const results: HierarchicalMatch[] = [];
    
    // Extract ALL possible brand+spec combinations
    const patterns = this.generateAllPatterns();
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.regex.exec(normalizedText)) !== null) {
        const brandRaw = match[1] || 'UNKNOWN'; // Handle cases where brand might be missing
        const specRaw = match[2] || match[0]; // Use full match if no spec group
        const fullMatch = match[0];
        
        // Skip if we got a meaningless match
        if (!brandRaw || brandRaw === 'UNKNOWN') continue;
        
        // Step 1: Get exact brand+spec matches using strict filter
        const searchQuery = this.buildSearchQuery(brandRaw, specRaw, pattern.type);
        const strictResult = brandStrictFilter.filterProducts(this.allProducts, searchQuery);
        
        if (strictResult.filteredProducts.length > 0) {
          // Step 2: Try to find specific model within exact matches
          const contextWindow = this.getContext(normalizedText, match.index!);
          const bestMatch = this.findBestModel(strictResult.filteredProducts, contextWindow, fullMatch);
          bestMatch.position = match.index!;
          
          results.push(bestMatch);
        } else {
          // Fallback: Try just brand matching for batteries with model names
          if (pattern.type === 'battery') {
            const brandOnlyResult = brandStrictFilter.filterProducts(this.allProducts, brandRaw);
            if (brandOnlyResult.filteredProducts.length > 0) {
              const contextWindow = this.getContext(normalizedText, match.index!);
              const bestMatch = this.findBestModel(brandOnlyResult.filteredProducts, contextWindow, fullMatch);
              bestMatch.confidence = Math.max(0.5, bestMatch.confidence - 0.1); // Lower confidence for brand-only
              bestMatch.position = match.index!;
              
              results.push(bestMatch);
            }
          }
        }
      }
    }
    
    // Remove duplicates and sort by confidence
    const uniqueResults = this.deduplicateMatches(results);
    return uniqueResults.sort((a, b) => b.confidence - a.confidence);
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
    
    // Panel patterns: Brand + Watts (100-700W range)
    patterns.push({
      regex: new RegExp(`\\b(${brandPattern})\\s+(\\d{3,4})W?\\b`, 'gi'),
      type: 'panel'
    });
    
    // Enhanced Battery patterns - Multiple formats to catch all battery mentions
    // Pattern 1: Brand + Capacity (Tesla 13.5, BYD 10, etc.)
    patterns.push({
      regex: new RegExp(`\\b(${brandPattern})\\s+(\\d{1,2}(?:\\.\\d)?)(?:\\s*kWh?)?\\b`, 'gi'),
      type: 'battery'
    });
    
    // Pattern 2: Brand + Model + Capacity (Tesla Powerwall 2, BYD HVM 16.6, etc.)
    patterns.push({
      regex: new RegExp(`\\b(${brandPattern})\\s+(?:powerwall|lynx|hvm|hvs|sbr|iq|alpha|smile)\\s*(?:\\d+(?:\\.\\d)?)?`, 'gi'),
      type: 'battery'
    });
    
    // Pattern 3: Standalone capacity with battery context (13.5kWh Battery, 10kWh Storage)
    patterns.push({
      regex: new RegExp(`\\b(\\d{1,2}(?:\\.\\d)?)\\s*kWh?\\s*(?:battery|storage|batt)`, 'gi'),
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
        if (cleanSpec && parseFloat(cleanSpec) <= 100) {
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