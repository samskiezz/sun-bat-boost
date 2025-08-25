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
    console.log(`Finding panel match for: "${description}"`);
    
    const candidates = this.panels.map(panel => {
      let score = 0;
      const brand = panel.brand.toLowerCase();
      const model = panel.model.toLowerCase();
      
      // Extract key identifiers from description
      const modelPattern = /([A-Z]{2,}\d{2,}[A-Z]*[-_]?\d*[A-Z]*[-_]?[A-Z0-9]*)/gi;
      const wattPattern = /(\d{3,})\s*[w]?(?:att)?/gi;
      const brandPattern = /(jinko|trina|canadian|lg|rec|sunpower|ja\s*solar|longi|risen|tiger)/gi;
      
      const descModelMatches = [...cleanDesc.matchAll(modelPattern)];
      const descWattMatches = [...cleanDesc.matchAll(wattPattern)];
      const descBrandMatches = [...cleanDesc.matchAll(brandPattern)];
      
      // 1. Exact model number match (highest priority)
      for (const match of descModelMatches) {
        const descModel = match[1].toLowerCase();
        if (model.includes(descModel) || descModel.includes(model.replace(/[-_]/g, ''))) {
          score += 1000;
          console.log(`Exact model match: ${descModel} vs ${model} (+1000)`);
        } else if (this.fuzzyModelMatch(descModel, model)) {
          score += 900;
          console.log(`Fuzzy model match: ${descModel} vs ${model} (+900)`);
        }
      }
      
      // 2. Power rating match
      for (const wattMatch of descWattMatches) {
        const watts = parseInt(wattMatch[1]);
        if (panel.power_rating && Math.abs(watts - panel.power_rating) <= 5) {
          score += 800;
          console.log(`Power match: ${watts}W vs ${panel.power_rating}W (+800)`);
        } else if (panel.power_rating && Math.abs(watts - panel.power_rating) <= 20) {
          score += 400;
          console.log(`Close power match: ${watts}W vs ${panel.power_rating}W (+400)`);
        }
      }
      
      // 3. Brand match
      for (const brandMatch of descBrandMatches) {
        const descBrand = brandMatch[1].toLowerCase();
        if (brand.includes(descBrand) || descBrand.includes(brand.toLowerCase())) {
          score += 500;
          console.log(`Brand match: ${descBrand} vs ${brand} (+500)`);
        }
      }
      
      // 4. Tiger Neo specific bonus
      if (cleanDesc.includes('tiger') && model.includes('tiger')) {
        score += 600;
        console.log(`Tiger Neo bonus (+600)`);
      }
      
      // 5. JKM series bonus
      if (cleanDesc.includes('jkm') && model.includes('jkm')) {
        score += 300;
        console.log(`JKM series bonus (+300)`);
      }
      
      return {
        ...panel,
        confidence: Math.min(score / 1000, 1),
        matchScore: score,
        matchType: score > 900 ? 'exact' : score > 600 ? 'high' : score > 300 ? 'medium' : 'low'
      };
    });
    
    const bestMatch = candidates
      .filter(c => c.matchScore > 300)
      .sort((a, b) => b.matchScore - a.matchScore)[0];
    
    if (bestMatch) {
      console.log(`Best panel match: ${bestMatch.brand} ${bestMatch.model} (${bestMatch.matchScore} points, ${(bestMatch.confidence * 100).toFixed(1)}% confidence)`);
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
    
    console.log('No suitable panel match found');
    return null;
  }

  // Advanced battery matching with capacity-based priority
  findBestBatteryMatch(description: string): MatchResult | null {
    const cleanDesc = description.toLowerCase().trim();
    console.log(`Finding battery match for: "${description}"`);
    
    // Extract capacity from description
    const capacityMatches = [...cleanDesc.matchAll(/(\d+(?:\.\d+)?)\s*kwh/gi)];
    const extractedCapacity = capacityMatches.length > 0 ? parseFloat(capacityMatches[0][1]) : null;
    
    console.log(`Extracted capacity: ${extractedCapacity}kWh`);
    
    const candidates = this.batteries.map(battery => {
      let score = 0;
      const brand = battery.brand.toLowerCase();
      const model = battery.model.toLowerCase();
      
      // 1. Capacity-based matching (highest priority for batteries)
      if (extractedCapacity && battery.capacity_kwh) {
        const capacityDiff = Math.abs(extractedCapacity - battery.capacity_kwh);
        if (capacityDiff <= 1) {
          score += 1200; // Almost exact capacity match
          console.log(`Exact capacity match: ${extractedCapacity}kWh vs ${battery.capacity_kwh}kWh (+1200)`);
        } else if (capacityDiff <= 3) {
          score += 1000; // Close capacity match
          console.log(`Close capacity match: ${extractedCapacity}kWh vs ${battery.capacity_kwh}kWh (+1000)`);
        } else if (capacityDiff <= 10) {
          score += 600; // Reasonable capacity match
          console.log(`Reasonable capacity match: ${extractedCapacity}kWh vs ${battery.capacity_kwh}kWh (+600)`);
        }
      }
      
      // 2. Brand matching
      if (cleanDesc.includes('sigen') && brand.includes('sigen')) {
        score += 800;
        console.log(`Sigenergy brand match (+800)`);
      } else if (cleanDesc.includes('tesla') && brand.includes('tesla')) {
        score += 800;
        console.log(`Tesla brand match (+800)`);
      } else if (cleanDesc.includes('lg') && brand.includes('lg')) {
        score += 800;
        console.log(`LG brand match (+800)`);
      }
      
      // 3. Model matching
      const modelPatterns = [
        /sigenstor/gi,
        /bat\s*\d+/gi,
        /powerwall/gi,
        /\d+(?:\.\d+)?\s*kwh/gi
      ];
      
      for (const pattern of modelPatterns) {
        if (pattern.test(cleanDesc) && pattern.test(model)) {
          score += 400;
          console.log(`Model pattern match (+400)`);
        }
      }
      
      // 4. Specific SigenStor matching
      if (cleanDesc.includes('sigenstor') && model.includes('sigenstor')) {
        score += 700;
        console.log(`SigenStor model match (+700)`);
      }
      
      return {
        ...battery,
        confidence: Math.min(score / 1200, 1),
        matchScore: score,
        matchType: score > 1000 ? 'exact' : score > 700 ? 'high' : score > 400 ? 'medium' : 'low'
      };
    });
    
    const bestMatch = candidates
      .filter(c => c.matchScore > 400)
      .sort((a, b) => b.matchScore - a.matchScore)[0];
    
    if (bestMatch) {
      console.log(`Best battery match: ${bestMatch.brand} ${bestMatch.model} (${bestMatch.matchScore} points, ${(bestMatch.confidence * 100).toFixed(1)}% confidence)`);
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
    
    console.log('No suitable battery match found');
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