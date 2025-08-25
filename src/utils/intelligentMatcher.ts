import { supabase } from '@/integrations/supabase/client';

export interface MatchResult {
  id: string;
  brand: string;
  model: string;
  confidence: number;
  matchType: string;
  power_rating?: number;
  capacity_kwh?: number;
  certificate?: string;
}

export class IntelligentMatcher {
  private panels: any[] = [];
  private batteries: any[] = [];
  private initialized = false;

  async initialize() {
    if (this.initialized) return;
    
    console.log('Loading equipment database for intelligent matching...');
    
    // Load all panels
    let from = 0;
    let hasMore = true;
    
    while (hasMore) {
      const { data, error } = await supabase
        .from('pv_modules')
        .select('*')
        .range(from, from + 999);

      if (error) {
        console.error('Error loading panels:', error);
        break;
      }

      if (data && data.length > 0) {
        this.panels = [...this.panels, ...data];
        from += 1000;
        hasMore = data.length === 1000;
      } else {
        hasMore = false;
      }
    }
    
    // Load all batteries
    from = 0;
    hasMore = true;
    
    while (hasMore) {
      const { data, error } = await supabase
        .from('batteries')
        .select('*')
        .range(from, from + 999);

      if (error) {
        console.error('Error loading batteries:', error);
        break;
      }

      if (data && data.length > 0) {
        this.batteries = [...this.batteries, ...data];
        from += 1000;
        hasMore = data.length === 1000;
      } else {
        hasMore = false;
      }
    }
    
    console.log(`Loaded ${this.panels.length} panels and ${this.batteries.length} batteries`);
    this.initialized = true;
  }

  // Advanced panel matching with multiple algorithms
  findBestPanelMatch(description: string): MatchResult | null {
    const cleanDesc = description.toLowerCase().trim();
    console.log(`🔆 Finding panel match for: "${description}"`);
    
    const candidates = this.panels.map(panel => {
      let score = 0;
      const brand = panel.brand?.toLowerCase() || '';
      const model = panel.model?.toLowerCase() || '';
      
      console.log(`\n  🔍 Checking panel: ${panel.brand} ${panel.model} (${panel.power_rating}W)`);
      
      // Extract key identifiers from description with ultra-flexible patterns
      const modelPatterns = [
        // JKM series - most flexible
        /JKM\d{3,}[A-Z0-9\-\.]*(?:Tiger.*Neo|N.*type)?[A-Z0-9\-\.]*/gi,
        // General model numbers
        /[A-Z]{2,}\d{2,}[A-Z0-9\-\.]*[A-Z0-9]*/gi,
        // Tiger Neo specific
        /Tiger.*Neo.*[A-Z0-9\-\.]*/gi
      ];
      
      const wattPatterns = [
        /(\d{3,})\s*[Ww]att?/gi,
        /(\d{3,})\s*W(?:\s|$)/gi,
        /(\d{3,})\s*(?=\s|$)/gi  // Just numbers that could be watts
      ];
      
      const brandPatterns = [
        /(jinko|trina|canadian|lg|rec|sunpower|ja\s*solar|longi|risen|tiger|jkm)/gi
      ];
      
      // Extract matches
      let descModelMatches: RegExpMatchArray[] = [];
      for (const pattern of modelPatterns) {
        descModelMatches = [...descModelMatches, ...cleanDesc.matchAll(pattern)];
      }
      
      const descWattMatches = [...cleanDesc.matchAll(/(\d{3,})/g)];
      const descBrandMatches = [...cleanDesc.matchAll(/(jinko|trina|canadian|lg|rec|sunpower|ja\s*solar|longi|risen|tiger)/gi)];
      
      console.log(`    Model matches: ${descModelMatches.map(m => m[0]).join(', ')}`);
      console.log(`    Watt matches: ${descWattMatches.map(m => m[0]).join(', ')}`);
      console.log(`    Brand matches: ${descBrandMatches.map(m => m[0]).join(', ')}`);
      
      // 1. EXACT MODEL NUMBER MATCHING (Ultra high priority) 
      for (const match of descModelMatches) {
        const descModel = match[0].toLowerCase().replace(/[-_\s]/g, '');
        const dbModel = model.replace(/[-_\s]/g, '');
        
        console.log(`    Comparing models: "${descModel}" vs "${dbModel}"`);
        
        // Exact match
        if (descModel === dbModel || dbModel.includes(descModel) || descModel.includes(dbModel)) {
          score += 1500;
          console.log(`    🎯 Exact model match (+1500)`);
        } 
        // Fuzzy match
        else if (this.fuzzyModelMatch(descModel, dbModel)) {
          score += 1200;
          console.log(`    🎯 Fuzzy model match (+1200)`);
        }
        // Partial match (for complex model numbers)
        else if (descModel.length >= 6 && dbModel.length >= 6) {
          const commonLength = this.getCommonPrefixLength(descModel, dbModel);
          if (commonLength >= 6) {
            score += 1000;
            console.log(`    🎯 Partial model match: ${commonLength} chars (+1000)`);
          }
        }
      }
      
      // 2. POWER RATING MATCHING (High priority)
      for (const wattMatch of descWattMatches) {
        const watts = parseInt(wattMatch[1]);
        if (panel.power_rating && watts >= 200 && watts <= 700) {  // Reasonable solar panel range
          const powerDiff = Math.abs(watts - panel.power_rating);
          console.log(`    Power diff: ${powerDiff}W (${watts} vs ${panel.power_rating})`);
          
          if (powerDiff <= 5) {
            score += 1200;
            console.log(`    ⚡ Perfect power match (+1200)`);
          } else if (powerDiff <= 20) {
            score += 800;
            console.log(`    ⚡ Close power match (+800)`);
          } else if (powerDiff <= 50) {
            score += 400;
            console.log(`    ⚡ Reasonable power match (+400)`);
          }
        }
      }
      
      // 3. BRAND MATCHING (Medium priority)
      for (const brandMatch of descBrandMatches) {
        const descBrand = brandMatch[1].toLowerCase();
        console.log(`    Checking brand: "${descBrand}" vs "${brand}"`);
        
        if (brand.includes(descBrand) || descBrand.includes(brand)) {
          score += 600;
          console.log(`    🏷️ Brand match: ${descBrand} (+600)`);
        }
      }
      
      // 4. SPECIAL BONUSES
      // Tiger Neo specific mega bonus
      if (cleanDesc.includes('tiger') && cleanDesc.includes('neo') && 
          model.includes('tiger') && model.includes('neo')) {
        score += 1000;
        console.log(`    🐅 Tiger Neo MEGA bonus (+1000)`);
      } else if (cleanDesc.includes('tiger') && model.includes('tiger')) {
        score += 700;
        console.log(`    🐅 Tiger bonus (+700)`);
      }
      
      // JKM series bonus
      if (cleanDesc.includes('jkm') && model.includes('jkm')) {
        score += 500;
        console.log(`    📱 JKM series bonus (+500)`);
      }
      
      // N-type bonus
      if (cleanDesc.includes('n-type') && model.includes('n-type')) {
        score += 300;
        console.log(`    🔬 N-type bonus (+300)`);
      }
      
      const confidence = Math.min(score / 1500, 1);
      const matchType = score > 1200 ? 'exact' : score > 800 ? 'high' : score > 500 ? 'medium' : 'low';
      
      console.log(`    Final score: ${score} (${(confidence * 100).toFixed(1)}% confidence, ${matchType})`);
      
      return {
        ...panel,
        confidence,
        matchScore: score,
        matchType
      };
    });
    
    const bestMatch = candidates
      .filter(c => c.matchScore > 500)  // Higher threshold for panels
      .sort((a, b) => b.matchScore - a.matchScore)[0];
    
    if (bestMatch) {
      console.log(`🏆 Best panel match: ${bestMatch.brand} ${bestMatch.model} (${bestMatch.matchScore} points, ${(bestMatch.confidence * 100).toFixed(1)}% confidence)`);
      return {
        id: bestMatch.id,
        brand: bestMatch.brand,
        model: bestMatch.model,
        confidence: bestMatch.confidence,
        matchType: bestMatch.matchType,
        power_rating: bestMatch.power_rating,
        certificate: bestMatch.certificate
      };
    }
    
    console.log('❌ No suitable panel match found');
    return null;
  }

  // Helper method for common prefix length
  private getCommonPrefixLength(str1: string, str2: string): number {
    let i = 0;
    while (i < str1.length && i < str2.length && str1[i] === str2[i]) {
      i++;
    }
    return i;
  }

  // Advanced battery matching with capacity-based priority
  findBestBatteryMatch(description: string): MatchResult | null {
    const cleanDesc = description.toLowerCase().trim();
    console.log(`🔋 Finding battery match for: "${description}"`);
    
    // Extract capacity from description with ultra-flexible patterns
    const capacityPatterns = [
      /(\d+(?:\.\d+)?)\s*kwh/gi,
      /(\d+(?:\.\d+)?)\s*kw\s*h/gi,
      /(\d+(?:\.\d+)?)\s*kw-h/gi,
      /(\d+(?:\.\d+)?)\s*kwh/gi
    ];
    
    let extractedCapacity = null;
    for (const pattern of capacityPatterns) {
      const matches = [...cleanDesc.matchAll(pattern)];
      if (matches.length > 0) {
        extractedCapacity = parseFloat(matches[0][1]);
        break;
      }
    }
    
    console.log(`Extracted capacity: ${extractedCapacity}kWh`);
    
    const candidates = this.batteries.map(battery => {
      let score = 0;
      const brand = battery.brand?.toLowerCase() || '';
      const model = battery.model?.toLowerCase() || '';
      
      console.log(`\n  🔍 Checking battery: ${battery.brand} ${battery.model} (${battery.capacity_kwh}kWh)`);
      
      // 1. CAPACITY-BASED MATCHING (Ultra high priority for batteries)
      if (extractedCapacity && battery.capacity_kwh) {
        const capacityDiff = Math.abs(extractedCapacity - battery.capacity_kwh);
        console.log(`    Capacity diff: ${capacityDiff}kWh (${extractedCapacity} vs ${battery.capacity_kwh})`);
        
        if (capacityDiff <= 0.5) {
          score += 1500; // Almost perfect capacity match
          console.log(`    🎯 Perfect capacity match (+1500)`);
        } else if (capacityDiff <= 2) {
          score += 1200; // Very close capacity match
          console.log(`    🎯 Very close capacity match (+1200)`);
        } else if (capacityDiff <= 5) {
          score += 1000; // Close capacity match
          console.log(`    🎯 Close capacity match (+1000)`);
        } else if (capacityDiff <= 10) {
          score += 600; // Reasonable capacity match
          console.log(`    🎯 Reasonable capacity match (+600)`);
        }
      }
      
      // 2. BRAND MATCHING (Ultra flexible)
      const brandPatterns = [
        'sigen', 'sigenergy', 
        'tesla', 'powerwall',
        'lg', 'lge',
        'sonnen', 'enphase',
        'pylontech', 'byd'
      ];
      
      for (const brandPattern of brandPatterns) {
        if (cleanDesc.includes(brandPattern) && brand.includes(brandPattern)) {
          score += 800;
          console.log(`    🏷️ Brand match: ${brandPattern} (+800)`);
        }
      }
      
      // Special Sigen brand boost
      if ((cleanDesc.includes('sigen') || cleanDesc.includes('sigenergy')) && 
          (brand.includes('sigen') || brand.includes('sigenergy'))) {
        score += 900;
        console.log(`    🏷️ Sigenergy brand boost (+900)`);
      }
      
      // 3. MODEL MATCHING (Flexible patterns)
      const modelPatterns = [
        // SigenStor patterns
        /sigenstor/gi,
        /sigen\s*stor/gi,
        // BAT models  
        /bat\s*\d+/gi,
        // Powerwall
        /powerwall/gi,
        // Generic battery model patterns
        /\d+(?:\.\d+)?\s*kwh/gi
      ];
      
      for (const pattern of modelPatterns) {
        const descMatches = pattern.test(cleanDesc);
        const modelMatches = pattern.test(model);
        
        if (descMatches && modelMatches) {
          score += 700;
          console.log(`    📱 Model pattern match (+700)`);
        }
      }
      
      // 4. SPECIFIC MODEL NUMBER MATCHING
      // Extract model numbers from both description and database
      const descModelNumbers = [...cleanDesc.matchAll(/[A-Z0-9]{3,}/gi)];
      const dbModelNumbers = [...model.matchAll(/[A-Z0-9]{3,}/gi)];
      
      for (const descMatch of descModelNumbers) {
        for (const dbMatch of dbModelNumbers) {
          const descModel = descMatch[0].toLowerCase();
          const dbModel = dbMatch[0].toLowerCase();
          
          if (descModel === dbModel) {
            score += 1000;
            console.log(`    🎯 Exact model match: ${descModel} (+1000)`);
          } else if (this.fuzzyModelMatch(descModel, dbModel)) {
            score += 800;
            console.log(`    🎯 Fuzzy model match: ${descModel} vs ${dbModel} (+800)`);
          }
        }
      }
      
      // 5. CONTEXTUAL BONUSES
      if (cleanDesc.includes('storage') && model.includes('stor')) {
        score += 300;
        console.log(`    🔋 Storage context bonus (+300)`);
      }
      
      if (cleanDesc.includes('battery') && (model.includes('bat') || brand.includes('battery'))) {
        score += 200;
        console.log(`    🔋 Battery context bonus (+200)`);
      }
      
      const confidence = Math.min(score / 1500, 1);
      const matchType = score > 1200 ? 'exact' : score > 800 ? 'high' : score > 500 ? 'medium' : 'low';
      
      console.log(`    Final score: ${score} (${(confidence * 100).toFixed(1)}% confidence, ${matchType})`);
      
      return {
        ...battery,
        confidence,
        matchScore: score,
        matchType
      };
    });
    
    const bestMatch = candidates
      .filter(c => c.matchScore > 500)  // Lower threshold for batteries
      .sort((a, b) => b.matchScore - a.matchScore)[0];
    
    if (bestMatch) {
      console.log(`🏆 Best battery match: ${bestMatch.brand} ${bestMatch.model} (${bestMatch.matchScore} points, ${(bestMatch.confidence * 100).toFixed(1)}% confidence)`);
      return {
        id: bestMatch.id,
        brand: bestMatch.brand,
        model: bestMatch.model,
        confidence: bestMatch.confidence,
        matchType: bestMatch.matchType,
        capacity_kwh: bestMatch.capacity_kwh,
        certificate: bestMatch.certificate
      };
    }
    
    console.log('❌ No suitable battery match found');
    return null;
  }

  // Fuzzy model matching for similar model numbers
  private fuzzyModelMatch(desc: string, model: string): boolean {
    // Remove common separators and normalize
    const cleanDesc = desc.replace(/[-_]/g, '').toLowerCase();
    const cleanModel = model.replace(/[-_]/g, '').toLowerCase();
    
    // Check if they share significant common substrings
    const minLength = Math.min(cleanDesc.length, cleanModel.length);
    if (minLength < 4) return false;
    
    let commonChars = 0;
    for (let i = 0; i < Math.min(cleanDesc.length, cleanModel.length); i++) {
      if (cleanDesc[i] === cleanModel[i]) {
        commonChars++;
      }
    }
    
    const similarity = commonChars / minLength;
    return similarity > 0.7; // 70% similarity threshold
  }

  // Extract numerical values with better regex
  private extractNumbers(text: string): number[] {
    const numbers = [...text.matchAll(/\d+(?:\.\d+)?/g)];
    return numbers.map(match => parseFloat(match[0]));
  }

  // Calculate string similarity
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  // Levenshtein distance calculation
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
}

// Singleton instance
const intelligentMatcher = new IntelligentMatcher();

export { intelligentMatcher };