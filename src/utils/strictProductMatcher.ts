/**
 * Strict Product Matcher - Zero tolerance for cross-wattage/cross-brand contamination
 * 
 * This matcher uses exact constraints to prevent:
 * - Jinko 440W becoming Jinko 580W
 * - Trina panels showing up in Jinko searches
 * - Any wattage substitutions within same series
 */

import { Product } from './smartMatcher';

export interface StrictMatchConfig {
  brandMustMatch: boolean;
  wattsMustMatch: boolean;
  seriesMustMatch: boolean;
  maxWattsTolerance: number;
}

const DEFAULT_CONFIG: StrictMatchConfig = {
  brandMustMatch: true,
  wattsMustMatch: true,
  seriesMustMatch: true,
  maxWattsTolerance: 0 // Zero tolerance for wattage differences
};

export class StrictProductMatcher {
  private config: StrictMatchConfig;

  constructor(config: Partial<StrictMatchConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Create ultra-strict regex that prevents cross-contamination
   */
  createStrictRegex(product: Product, extractedWatts?: number): string {
    const brand = this.normalizeBrand(product.brand);
    const model = product.model.trim();
    const watts = extractedWatts || product.power_rating || this.extractWatts(model);

    // Build components
    const brandPattern = this.getBrandPattern(brand);
    const modelPattern = this.getModelPattern(model, watts);
    const wattsPattern = watts ? `${watts}W?` : '\\d{3,4}W?';

    // Combine with strict boundaries
    return `\\b${brandPattern}[\\s-]?${modelPattern}[\\s-]?${wattsPattern}\\b`;
  }

  /**
   * Validate if a match is acceptable under strict rules
   */
  validateMatch(
    foundProduct: Product, 
    searchBrand: string, 
    searchWatts?: number
  ): boolean {
    // Brand must match exactly
    if (this.config.brandMustMatch) {
      const normalizedSearchBrand = this.normalizeBrand(searchBrand);
      const normalizedProductBrand = this.normalizeBrand(foundProduct.brand);
      
      if (normalizedSearchBrand !== normalizedProductBrand) {
        console.log(`❌ Brand mismatch: ${normalizedSearchBrand} vs ${normalizedProductBrand}`);
        return false;
      }
    }

    // Watts must match within tolerance
    if (this.config.wattsMustMatch && searchWatts && foundProduct.power_rating) {
      const wattsDiff = Math.abs(foundProduct.power_rating - searchWatts);
      if (wattsDiff > this.config.maxWattsTolerance) {
        console.log(`❌ Watts mismatch: ${searchWatts}W vs ${foundProduct.power_rating}W (tolerance: ${this.config.maxWattsTolerance}W)`);
        return false;
      }
    }

    return true;
  }

  /**
   * Generate strict aliases that prevent confusion
   */
  generateStrictAliases(product: Product): string[] {
    const model = product.model.trim();
    const brand = product.brand.trim();
    const watts = product.power_rating;

    const aliases = new Set<string>();

    // Add exact model variations
    aliases.add(model);
    aliases.add(model.toUpperCase());
    aliases.add(`${brand} ${model}`);
    aliases.add(`${brand.toUpperCase()} ${model.toUpperCase()}`);

    // Add wattage-specific variations only
    if (watts) {
      aliases.add(`${brand} ${watts}W`);
      aliases.add(`${brand.toUpperCase()} ${watts}W`);
    }

    // Space/hyphen variations but maintain exact terms
    const spaceVariants = Array.from(aliases);
    spaceVariants.forEach(alias => {
      aliases.add(alias.replace(/\s+/g, '-'));
      aliases.add(alias.replace(/\s+/g, ''));
      aliases.add(alias.replace(/[-]/g, ' '));
    });

    return Array.from(aliases).slice(0, 20); // Limit to prevent bloat
  }

  private normalizeBrand(brand: string): string {
    const normalized = brand.trim().toUpperCase();
    
    // Brand normalization map
    const brandMap: { [key: string]: string } = {
      'JINKO SOLAR': 'JINKO',
      'TRINA SOLAR': 'TRINA',
      'CANADIAN SOLAR': 'CANADIAN',
      'LONGI SOLAR': 'LONGI',
      'LONGI GREEN ENERGY': 'LONGI',
      'JA SOLAR': 'JA',
      'HANWHA Q CELLS': 'QCELLS',
      'Q CELLS': 'QCELLS',
      'GOODWE': 'GOODWE',
      'SUNGROW': 'SUNGROW',
      'SOLAREDGE': 'SOLAREDGE'
    };

    return brandMap[normalized] || normalized;
  }

  private getBrandPattern(brand: string): string {
    // Exact brand patterns with common variations
    const brandPatterns: { [key: string]: string } = {
      'JINKO': '(?:JINKO|JINKO[\\s-]?SOLAR)',
      'TRINA': '(?:TRINA|TRINA[\\s-]?SOLAR)',
      'CANADIAN': '(?:CANADIAN|CANADIAN[\\s-]?SOLAR)',
      'LONGI': '(?:LONGI|LONGI[\\s-]?SOLAR|LONGI[\\s-]?GREEN)',
      'JA': '(?:JA|JA[\\s-]?SOLAR)',
      'QCELLS': '(?:QCELLS|Q[\\s-]?CELLS|HANWHA)',
      'GOODWE': 'GOODWE',
      'SUNGROW': 'SUNGROW',
      'SOLAREDGE': 'SOLAREDGE'
    };

    return brandPatterns[brand] || brand.replace(/\s+/g, '[\\s-]?');
  }

  private getModelPattern(model: string, watts?: number): string {
    // Extract key model identifiers while preserving watts specificity
    let pattern = model
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape regex chars
      .replace(/\s+/g, '[\\s-]?'); // Allow space/hyphen flexibility
    
    // If watts is specified, ensure pattern doesn't match other wattages
    if (watts) {
      // Replace any existing wattage in pattern with exact match
      pattern = pattern.replace(/\d{3,4}W?/g, `${watts}W?`);
    }

    return pattern;
  }

  private extractWatts(model: string): number | undefined {
    // Extract wattage from model string
    const wattsMatch = model.match(/(\d{3,4})W?/);
    return wattsMatch ? parseInt(wattsMatch[1]) : undefined;
  }
}

export const strictMatcher = new StrictProductMatcher();