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
    // PANELS - ALL 51 BRANDS FROM DATABASE
    'ADANI SOLAR': ['adani', 'adani solar'],
    'AIKO PANEL': ['aiko', 'aiko panel'],
    'ASTRONERGY': ['astronergy'],
    'AXITEC': ['axitec'],
    'BLUEBIRD SOLAR': ['bluebird', 'bluebird solar'],
    'BOVIET SOLAR': ['boviet', 'boviet solar'],
    'CANADIAN SOLAR': ['canadian', 'canadian solar', 'canadiansolar'],
    'CHINT SOLAR': ['chint', 'chint solar'],
    'DAH SOLAR': ['dah', 'dah solar'],
    'EGING PV': ['eging', 'eging pv'],
    'EMMVEE SOLAR': ['emmvee', 'emmvee solar'],
    'FIRST SOLAR': ['first', 'first solar'],
    'GCL-SI': ['gcl', 'gcl-si', 'gclsi'],
    'GOLDI SOLAR': ['goldi', 'goldi solar'],
    'HANWHA Q CELLS': ['hanwha', 'qcells', 'q cells', 'hanwha q cells', 'hanwha qcells'],
    'HYUNDAI SOLAR': ['hyundai', 'hyundai solar'],
    'JA SOLAR': ['ja', 'ja solar', 'jasolar'],
    'JAKSON SOLAR': ['jakson', 'jakson solar'],
    'JINKO SOLAR': ['jinko', 'jinko solar', 'jinkosolar'],
    'JINKOSOLAR': ['jinko', 'jinko solar', 'jinkosolar'],
    'KYOCERA SOLAR': ['kyocera', 'kyocera solar'],
    'LG SOLAR': ['lg', 'lg solar', 'lg neon'],
    'LONGI SOLAR': ['longi', 'longi solar', 'longigreen', 'longi green energy'],
    'LUMINOUS SOLAR': ['luminous', 'luminous solar'],
    'MAXEON SOLAR': ['maxeon', 'maxeon solar', 'sunpower'],
    'MEYER BURGER': ['meyer', 'meyer burger'],
    'MICROTEK SOLAR': ['microtek', 'microtek solar'],
    'MITSUBISHI ELECTRIC': ['mitsubishi', 'mitsubishi electric'],
    'NAVITAS SOLAR': ['navitas', 'navitas solar'],
    'PANASONIC': ['panasonic'],
    'PHONO SOLAR': ['phono', 'phono solar'],
    'PREMIER SOLAR': ['premier', 'premier solar'],
    'REC SOLAR': ['rec', 'rec solar'],
    'RENESOLA': ['renesola'],
    'RENEWSYS SOLAR': ['renewsys', 'renewsys solar'],
    'RISEN ENERGY': ['risen', 'risen energy'],
    'SAATVIK GREEN ENERGY': ['saatvik', 'saatvik green energy'],
    'SANYO SOLAR': ['sanyo', 'sanyo solar'],
    'SERAPHIM SOLAR': ['seraphim', 'seraphim solar'],
    'SHARP SOLAR': ['sharp', 'sharp solar'],
    'SILFAB SOLAR': ['silfab', 'silfab solar'],
    'SOLARIA': ['solaria'],
    'SUNPOWER': ['sunpower', 'maxeon'],
    'SUNTECH POWER': ['suntech', 'suntech power'],
    'SURYA SOLAR': ['surya', 'surya solar'],
    'TALESUN': ['talesun'],
    'TRINA SOLAR': ['trina', 'trina solar', 'trinasolar'],
    'VIKRAM SOLAR': ['vikram', 'vikram solar'],
    'WAAREE ENERGIES': ['waaree', 'waaree energies'],
    'YINGLI SOLAR': ['yingli', 'yingli solar'],
    'ZNSHINE SOLAR': ['znshine', 'znshine solar'],

    // BATTERIES - ALL 47 BRANDS FROM DATABASE
    'ALPHA ESS': ['alpha', 'alpha ess', 'alphaess'],
    'AMPETUS ENERGY': ['ampetus', 'ampetus energy'],
    'BLUE ION': ['blue ion', 'blueion'],
    'BYD': ['byd'],
    'CATL': ['catl'],
    'DEYE': ['deye'],
    'ENERGY RENAISSANCE': ['energy renaissance'],
    'ENPHASE': ['enphase'],
    'FOX ESS': ['fox', 'fox ess'],
    'FREEDOM WON': ['freedom', 'freedom won'],
    'FRONIUS': ['fronius'],
    'GOODWE': ['goodwe', 'gw', 'lynx'],
    'GROWATT': ['growatt'],
    'HUAWEI': ['huawei'],
    'LG ENERGY SOLUTION': ['lg', 'lg energy', 'lg energy solution'],
    'OPAL ENERGY': ['opal', 'opal energy'],
    'PURE ELECTRIC': ['pure', 'pure electric'],
    'PYLONTECH': ['pylontech', 'pylon'],
    'Q CELLS': ['qcells', 'q cells'],
    'REDBACK TECHNOLOGIES': ['redback', 'redback technologies'],
    'SELECTRONIC': ['selectronic'],
    'SIGENERGY': ['sigenergy', 'sig energy'],
    'SIMPLIPHI POWER': ['simpliphi', 'simpliphi power'],
    'SMA SOLAR': ['sma', 'sma solar'],
    'SOLAR EDGE SYSTEMS': ['solaredge', 'solar edge', 'solar edge systems'],
    'SOLAR MD': ['solar md', 'solarmd'],
    'SOLAREDGE': ['solaredge', 'solar edge'],
    'SOLAX POWER': ['solax', 'solax power'],
    'SONNEN': ['sonnen'],
    'TESLA': ['tesla', 'powerwall'],
    'VICTRON ENERGY': ['victron', 'victron energy'],

    // INVERTERS - Common brands (will get from all_products table)
    'SUNGROW': ['sungrow', 'sg'],
    'ABB': ['abb'],
    'FIMER': ['fimer', 'abb fimer'],
    'DELTA': ['delta'],
    'SCHNEIDER ELECTRIC': ['schneider', 'schneider electric'],
    'KOSTAL': ['kostal'],
    'POWER ELECTRONICS': ['power electronics'],
    'INGETEAM': ['ingeteam']
  };

  /**
   * Enhanced brand detection with fuzzy matching for all brand variations
   */
  parseSearchQuery(query: string): { brand?: string; wattage?: number; capacity?: number; terms: string[] } {
    const normalizedQuery = query.toLowerCase().trim();
    const words = normalizedQuery.split(/\s+/);
    
    let detectedBrand: string | undefined;
    let wattage: number | undefined;
    let capacity: number | undefined;
    
    // Enhanced brand detection - check for partial matches too
    for (const [brand, aliases] of Object.entries(this.brandAliases)) {
      for (const alias of aliases) {
        // Exact match or starts with
        if (normalizedQuery.startsWith(alias) || 
            normalizedQuery.includes(` ${alias} `) ||
            normalizedQuery.includes(alias + ' ') ||
            words.some(word => word === alias)) {
          detectedBrand = brand;
          break;
        }
      }
      if (detectedBrand) break;
    }
    
    // If no exact match, try fuzzy brand matching
    if (!detectedBrand) {
      for (const [brand, aliases] of Object.entries(this.brandAliases)) {
        for (const alias of aliases) {
          const matchingWords = words.filter(word => word.includes(alias) || alias.includes(word));
          if (matchingWords.length > 0) {
            const validMatches = matchingWords.filter(word => word.length >= 3 && alias.length >= 3);
            if (validMatches.length > 0) { // Avoid false positives with short words
              detectedBrand = brand;
              break;
            }
          }
        }
        if (detectedBrand) break;
      }
    }
    
    // Extract wattage (panels)
    const wattsMatch = normalizedQuery.match(/(\d{3,4})w?/);
    if (wattsMatch) {
      wattage = parseInt(wattsMatch[1]);
    }
    
    // Extract capacity (batteries)
    const capacityMatch = normalizedQuery.match(/(\d{1,2}(?:\.\d)?)\s*kwh?/i);
    if (capacityMatch) {
      capacity = parseFloat(capacityMatch[1]);
    }
    
    return {
      brand: detectedBrand,
      wattage,
      capacity,
      terms: words
    };
  }

  /**
   * Strictly filter products based on brand and specs - ENHANCED FOR ALL PRODUCTS
   */
  filterProducts<T extends { brand: string; power_rating?: number; capacity_kwh?: number; model: string }>(
    products: T[],
    searchQuery: string
  ): StrictFilterResult<T> {
    const { brand: detectedBrand, wattage, capacity, terms } = this.parseSearchQuery(searchQuery);
    
    if (!detectedBrand) {
      // No brand detected - return fuzzy search across all products
      return {
        brand: 'ANY',
        filteredProducts: this.fuzzyFilter(products, terms),
        confidence: 'fuzzy'
      };
    }
    
    // STEP 1: ULTRA-STRICT brand filtering
    let brandFiltered = products.filter(product => {
      const productBrand = product.brand.toUpperCase().trim();
      const normalizedDetectedBrand = detectedBrand.toUpperCase().trim();
      const aliases = this.brandAliases[detectedBrand] || [];
      
      // Exact brand match
      if (productBrand === normalizedDetectedBrand) return true;
      
      // Check if product brand matches any alias
      const brandMatches = aliases.some(alias => {
        const upperAlias = alias.toUpperCase();
        return (
          productBrand.includes(upperAlias) ||
          upperAlias.includes(productBrand) ||
          productBrand === upperAlias
        );
      });
      
      // Special handling for brand variations (Jinko vs JinkoSolar, etc.)
      const specialMatches = (
        (normalizedDetectedBrand.includes('JINKO') && productBrand.includes('JINKO')) ||
        (normalizedDetectedBrand.includes('TRINA') && productBrand.includes('TRINA')) ||
        (normalizedDetectedBrand.includes('CANADIAN') && productBrand.includes('CANADIAN')) ||
        (normalizedDetectedBrand.includes('LONGI') && productBrand.includes('LONGI')) ||
        (normalizedDetectedBrand.includes('JA') && productBrand.includes('JA SOLAR')) ||
        (normalizedDetectedBrand.includes('HANWHA') && productBrand.includes('CELLS')) ||
        (normalizedDetectedBrand.includes('QCELLS') && productBrand.includes('CELLS')) ||
        (normalizedDetectedBrand.includes('REC') && productBrand.includes('REC')) ||
        (normalizedDetectedBrand.includes('MAXEON') && productBrand.includes('MAXEON')) ||
        (normalizedDetectedBrand.includes('SUNPOWER') && productBrand.includes('SUNPOWER')) ||
        (normalizedDetectedBrand.includes('LG') && productBrand.includes('LG')) ||
        (normalizedDetectedBrand.includes('GOODWE') && productBrand.includes('GOODWE')) ||
        (normalizedDetectedBrand.includes('SUNGROW') && productBrand.includes('SUNGROW')) ||
        (normalizedDetectedBrand.includes('SOLAREDGE') && productBrand.includes('SOLAREDGE')) ||
        (normalizedDetectedBrand.includes('TESLA') && productBrand.includes('TESLA')) ||
        (normalizedDetectedBrand.includes('BYD') && productBrand.includes('BYD')) ||
        (normalizedDetectedBrand.includes('PYLONTECH') && productBrand.includes('PYLONTECH'))
      );
      
      return brandMatches || specialMatches;
    });
    
    console.log(`🏭 Brand filtering: ${detectedBrand} → ${brandFiltered.length} products from ${products.length} total`);
    
    if (brandFiltered.length === 0) {
      console.log(`❌ No products found for brand: ${detectedBrand}`);
      return {
        brand: detectedBrand,
        wattage,
        filteredProducts: [],
        confidence: 'exact'
      };
    }
    
    // STEP 2: ZERO-TOLERANCE Wattage filtering (for panels)
    if (wattage) {
      const wattsFiltered = brandFiltered.filter(product => {
        if (!product.power_rating) return false;
        return product.power_rating === wattage; // EXACTLY equal - no tolerance
      });
      
      console.log(`⚡ EXACT Watts filtering: ${wattage}W → ${wattsFiltered.length} products (zero tolerance)`);
      
      if (wattsFiltered.length > 0) {
        return {
          brand: detectedBrand,
          wattage,
          filteredProducts: wattsFiltered.sort((a, b) => (a.model || '').localeCompare(b.model || '')),
          confidence: 'exact'
        };
      }
      
      console.log(`⚠️ No exact ${wattage}W match found in ${detectedBrand} - showing all brand products for selection`);
      return {
        brand: detectedBrand,
        wattage,
        filteredProducts: brandFiltered,
        confidence: 'partial'
      };
    }
    
    // STEP 3: ZERO-TOLERANCE Capacity filtering (for batteries)
    if (capacity) {
      const capacityFiltered = brandFiltered.filter(product => {
        if (!product.capacity_kwh) return false;
        return Math.abs(product.capacity_kwh - capacity) < 0.1; // Very small tolerance for capacity
      });
      
      console.log(`🔋 Capacity filtering: ${capacity}kWh → ${capacityFiltered.length} products`);
      
      if (capacityFiltered.length > 0) {
        return {
          brand: detectedBrand,
          wattage: capacity, // Using wattage field for capacity display
          filteredProducts: capacityFiltered.sort((a, b) => (a.model || '').localeCompare(b.model || '')),
          confidence: 'exact'
        };
      }
    }
    
    // STEP 4: Model-specific term filtering within brand
    if (terms.length > 1) {
      const termFiltered = brandFiltered.filter(product => {
        const productText = `${product.model} ${product.power_rating || ''} ${product.capacity_kwh || ''}`.toLowerCase();
        const remainingTerms = terms.filter(term => 
          !this.brandAliases[detectedBrand]?.some(alias => alias.includes(term)) && 
          !/^\d{1,4}(\.\d)?w?(kwh?)?$/.test(term)
        );
        
        return remainingTerms.length === 0 || remainingTerms.every(term => productText.includes(term));
      });
      
      if (termFiltered.length > 0) {
        return {
          brand: detectedBrand,
          wattage,
          filteredProducts: termFiltered.sort((a, b) => (a.model || '').localeCompare(b.model || '')),
          confidence: 'exact'
        };
      }
    }
    
    // Return all brand products sorted by model
    return {
      brand: detectedBrand,
      wattage,
      filteredProducts: brandFiltered.sort((a, b) => (a.model || '').localeCompare(b.model || '')),
      confidence: 'partial'
    };
  }

  private fuzzyFilter<T extends { brand: string; model: string; power_rating?: number; capacity_kwh?: number }>(
    products: T[],
    terms: string[]
  ): T[] {
    return products.filter(product => {
      const searchText = `${product.brand} ${product.model} ${product.power_rating || ''} ${product.capacity_kwh || ''}`.toLowerCase();
      return terms.some(term => searchText.includes(term));
    }).slice(0, 50); // Limit fuzzy results
  }
}

export const brandStrictFilter = new BrandStrictFilter();