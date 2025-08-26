/**
 * Brand Strict Filter - Prevents cross-brand contamination in search results
 * 
 * This ensures that:
 * - "Jinko 440" ONLY returns Jinko products with 440W
 * - "Trina" ONLY returns Trina products
 * - No cross-brand results appear
 */

export interface StrictFilterResult<T> {
  brand: string;
  wattage?: number;
  filteredProducts: T[];
  confidence: 'exact' | 'partial' | 'fuzzy';
}

export class BrandStrictFilter {
  private brandAliases: Record<string, string[]> = {
    'JINKO': ['jinko', 'jinko solar', 'jinkosolar'],
    'TRINA': ['trina', 'trina solar', 'trinasolar'],
    'CANADIAN': ['canadian', 'canadian solar', 'canadiansolar'],
    'LONGI': ['longi', 'longi solar', 'longigreen', 'longi green energy'],
    'JA': ['ja', 'ja solar', 'jasolar'],
    'QCELLS': ['qcells', 'q cells', 'hanwha', 'hanwha q cells'],
    'REC': ['rec', 'rec solar'],
    'MAXEON': ['maxeon', 'sunpower'],
    'LG': ['lg', 'lg neon'],
    'WINAICO': ['winaico'],
    'RISEN': ['risen'],
    'SERAPHIM': ['seraphim'],
    'ASTRONERGY': ['astronergy'],
    'ADANI': ['adani', 'adani solar'],
    'AIKO': ['aiko', 'aiko panel'],
    'GOODWE': ['goodwe', 'gw'],
    'SUNGROW': ['sungrow', 'sg'],
    'SOLAREDGE': ['solaredge', 'se'],
    'FRONIUS': ['fronius'],
    'SMA': ['sma'],
    'TESLA': ['tesla'],
    'BYD': ['byd'],
    'PYLONTECH': ['pylontech']
  };

  /**
   * Parse search query to extract brand and specifications
   */
  parseSearchQuery(query: string): { brand?: string; wattage?: number; terms: string[] } {
    const normalizedQuery = query.toLowerCase().trim();
    const words = normalizedQuery.split(/\s+/);
    
    let detectedBrand: string | undefined;
    let wattage: number | undefined;
    
    // Detect brand from first word(s)
    for (const [brand, aliases] of Object.entries(this.brandAliases)) {
      for (const alias of aliases) {
        if (normalizedQuery.startsWith(alias)) {
          detectedBrand = brand;
          break;
        }
      }
      if (detectedBrand) break;
    }
    
    // Extract wattage
    const wattsMatch = normalizedQuery.match(/(\d{3,4})w?/);
    if (wattsMatch) {
      wattage = parseInt(wattsMatch[1]);
    }
    
    return {
      brand: detectedBrand,
      wattage,
      terms: words
    };
  }

  /**
   * Strictly filter products based on brand and specs
   */
  filterProducts<T extends { brand: string; power_rating?: number; model: string }>(
    products: T[],
    searchQuery: string
  ): StrictFilterResult<T> {
    const { brand: detectedBrand, wattage, terms } = this.parseSearchQuery(searchQuery);
    
    if (!detectedBrand) {
      // No brand detected - return fuzzy search across all products
      return {
        brand: 'ANY',
        filteredProducts: this.fuzzyFilter(products, terms),
        confidence: 'fuzzy'
      };
    }
    
    // STEP 1: STRICT brand filtering
    let brandFiltered = products.filter(product => {
      const productBrand = product.brand.toUpperCase();
      const aliases = this.brandAliases[detectedBrand] || [];
      
      return aliases.some(alias => 
        productBrand.includes(alias.toUpperCase()) || 
        alias.toUpperCase().includes(productBrand)
      ) || productBrand === detectedBrand;
    });
    
    console.log(`🏭 Brand filtering: ${detectedBrand} → ${brandFiltered.length} products`);
    
    if (brandFiltered.length === 0) {
      // No products found for this brand
      return {
        brand: detectedBrand,
        wattage,
        filteredProducts: [],
        confidence: 'exact'
      };
    }
    
    // STEP 2: Wattage filtering (if specified)
    if (wattage) {
      const wattsFiltered = brandFiltered.filter(product => {
        if (!product.power_rating) return false;
        return Math.abs(product.power_rating - wattage) <= 0; // Zero tolerance
      });
      
      console.log(`⚡ Watts filtering: ${wattage}W → ${wattsFiltered.length} products`);
      
      if (wattsFiltered.length > 0) {
        return {
          brand: detectedBrand,
          wattage,
          filteredProducts: wattsFiltered,
          confidence: 'exact'
        };
      }
      
      // No exact wattage match - return all brand products for user selection
      return {
        brand: detectedBrand,
        wattage,
        filteredProducts: brandFiltered,
        confidence: 'partial'
      };
    }
    
    // STEP 3: Additional term filtering within brand
    if (terms.length > 1) {
      const termFiltered = brandFiltered.filter(product => {
        const productText = `${product.model} ${product.power_rating || ''}`.toLowerCase();
        const remainingTerms = terms.filter(term => 
          !this.brandAliases[detectedBrand]?.includes(term) && 
          !/^\d{3,4}w?$/.test(term)
        );
        
        return remainingTerms.every(term => productText.includes(term));
      });
      
      if (termFiltered.length > 0) {
        return {
          brand: detectedBrand,
          wattage,
          filteredProducts: termFiltered,
          confidence: 'exact'
        };
      }
    }
    
    return {
      brand: detectedBrand,
      wattage,
      filteredProducts: brandFiltered,
      confidence: 'partial'
    };
  }

  private fuzzyFilter<T extends { brand: string; model: string; power_rating?: number }>(
    products: T[],
    terms: string[]
  ): T[] {
    return products.filter(product => {
      const searchText = `${product.brand} ${product.model} ${product.power_rating || ''}`.toLowerCase();
      return terms.some(term => searchText.includes(term));
    }).slice(0, 50); // Limit fuzzy results
  }
}

export const brandStrictFilter = new BrandStrictFilter();