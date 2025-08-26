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
    console.log(`🏭 Hierarchical matcher initialized with ${products.length} products`);
  }

  /**
   * Main matching function - processes text hierarchically for ALL products
   */
  match(text: string): HierarchicalMatch[] {
    console.log('🎯 Starting comprehensive hierarchical matching for all products...');
    
    const normalizedText = text.toUpperCase();
    const results: HierarchicalMatch[] = [];
    
    // Extract ALL possible brand+spec combinations
    const patterns = this.generateAllPatterns();
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.regex.exec(normalizedText)) !== null) {
        const brandRaw = match[1];
        const specRaw = match[2];
        const fullMatch = match[0];
        
        console.log(`🔍 Found: ${brandRaw} ${specRaw} (${pattern.type})`);
        
        // Step 1: Get exact brand+spec matches using strict filter
        const searchQuery = this.buildSearchQuery(brandRaw, specRaw, pattern.type);
        const strictResult = brandStrictFilter.filterProducts(this.allProducts, searchQuery);
        
        if (strictResult.filteredProducts.length > 0) {
          console.log(`✅ Found ${strictResult.filteredProducts.length} exact matches for ${brandRaw} ${specRaw}`);
          
          // Step 2: Try to find specific model within exact matches
          const contextWindow = this.getContext(normalizedText, match.index!);
          const bestMatch = this.findBestModel(strictResult.filteredProducts, contextWindow, fullMatch);
          
          results.push(bestMatch);
        } else {
          console.log(`❌ No exact matches found for ${brandRaw} ${specRaw}`);
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
    
    console.log(`🔧 Generating patterns for ${allBrands.length} unique brands`);
    
    // Create brand alternatives string for regex
    const brandPattern = allBrands
      .map(brand => brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) // Escape regex chars
      .join('|');
    
    // Panel patterns: Brand + Watts (100-700W range)
    patterns.push({
      regex: new RegExp(`\\b(${brandPattern})\\s+(\\d{3,4})W?\\b`, 'gi'),
      type: 'panel'
    });
    
    // Battery patterns: Brand + kWh (1-100 kWh range)
    patterns.push({
      regex: new RegExp(`\\b(${brandPattern})\\s+(\\d{1,2}(?:\\.\\d)??)\\s*KWH?\\b`, 'gi'),
      type: 'battery'
    });
    
    // Inverter patterns: Brand + kW (1-50 kW range)
    patterns.push({
      regex: new RegExp(`\\b(${brandPattern})\\s+(\\d{1,2}(?:\\.\\d)?)\\s*KW\\b`, 'gi'),
      type: 'inverter'
    });
    
    console.log(`📋 Generated ${patterns.length} pattern types for all brands`);
    return patterns;
  }

  /**
   * Build search query for strict filtering
   */
  private buildSearchQuery(brand: string, spec: string, type: 'panel' | 'battery' | 'inverter'): string {
    const specNum = parseFloat(spec);
    
    switch (type) {
      case 'panel':
        return `${brand} ${specNum}W`;
      case 'battery':
        return `${brand} ${specNum}kWh`;
      case 'inverter':
        return `${brand} ${specNum}kW`;
      default:
        return `${brand} ${spec}`;
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
          console.log(`🎯 Model match: ${product.model} (${foundTokens} tokens, confidence: ${totalConfidence})`);
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
    
    return tokens;
  }

  /**
   * Get weight for model token based on significance
   */
  private getTokenWeight(token: string): number {
    const upper = token.toUpperCase();
    
    // High-value model indicators
    if (/^(TIGER|NEO|VERTEX|ALPHA|POWERWALL|LYNX|HONEY|DUOMAX|PEAK|MAXX)$/i.test(upper)) {
      return 0.15;
    }
    
    // Medium-value indicators
    if (/^(HL4|HC|DT|EH|ET|RS|SBR|HVM|HVS|IQ|SG|GW)$/i.test(upper)) {
      return 0.10;
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