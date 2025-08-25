import { compareTwoStrings } from 'string-similarity';

export interface MatchCandidate {
  id: string;
  brand: string;
  model: string;
  cec_id?: string;
  power_rating?: number;
  capacity_kwh?: number;
  usable_capacity?: number;
}

export interface FuzzyMatchResult extends MatchCandidate {
  confidence: number;
  matchType: 'brand_model' | 'model_only' | 'brand_only';
}

export function fuzzyMatch(
  modelFreeText: string, 
  candidates: MatchCandidate[]
): FuzzyMatchResult | null {
  const query = modelFreeText.replace(/\s+/g, ' ').trim().toLowerCase();
  
  let best = { 
    score: 0, 
    item: null as MatchCandidate | null,
    matchType: 'model_only' as 'brand_model' | 'model_only' | 'brand_only'
  };

  for (const candidate of candidates) {
    if (!candidate.brand || !candidate.model) continue;
    
    const brand = candidate.brand.toLowerCase();
    const model = candidate.model.toLowerCase();
    
    // Enhanced matching strategies
    
    // 1. Exact brand + model match (highest priority)
    const brandModelScore = compareTwoStrings(query, `${brand} ${model}`);
    
    // 2. Model contains query or query contains model
    const modelScore = Math.max(
      compareTwoStrings(query, model),
      model.includes(query) ? 0.8 : 0,
      query.includes(model) && model.length > 3 ? 0.75 : 0
    );
    
    // 3. Brand contains query or query contains brand
    const brandScore = Math.max(
      compareTwoStrings(query, brand),
      brand.includes(query) ? 0.7 : 0,
      query.includes(brand) && brand.length > 2 ? 0.65 : 0
    );
    
    // 4. Partial word matching for brand names
    const brandWords = brand.split(/[\s\-]+/);
    const queryWords = query.split(/[\s\-]+/);
    let partialBrandScore = 0;
    
    for (const queryWord of queryWords) {
      for (const brandWord of brandWords) {
        if (queryWord.length > 2 && brandWord.includes(queryWord)) {
          partialBrandScore = Math.max(partialBrandScore, 0.6);
        }
        if (brandWord.length > 2 && queryWord.includes(brandWord)) {
          partialBrandScore = Math.max(partialBrandScore, 0.55);
        }
      }
    }
    
    // 5. Model number pattern matching (for technical product codes)
    const modelPattern = /[A-Z]{2,}\-?\d{3,}[A-Z0-9]*/gi;
    const queryModelMatch = query.match(modelPattern);
    const candidateModelMatch = model.match(modelPattern);
    
    let patternScore = 0;
    if (queryModelMatch && candidateModelMatch) {
      for (const qMatch of queryModelMatch) {
        for (const cMatch of candidateModelMatch) {
          patternScore = Math.max(patternScore, compareTwoStrings(qMatch.toLowerCase(), cMatch.toLowerCase()));
        }
      }
    }
    
    // Determine best match type and score
    const scores = [
      { score: brandModelScore, type: 'brand_model' as const },
      { score: Math.max(modelScore, patternScore), type: 'model_only' as const },
      { score: Math.max(brandScore, partialBrandScore), type: 'brand_only' as const }
    ];
    
    const bestForCandidate = scores.reduce((best, current) => 
      current.score > best.score ? current : best
    );
    
    if (bestForCandidate.score > best.score) {
      best = { 
        score: bestForCandidate.score, 
        item: candidate, 
        matchType: bestForCandidate.type 
      };
    }
  }

  // Return match if confidence is above threshold
  // Lower threshold for better matching of quote line items
  if (best.score >= 0.4 && best.item) {
    return {
      ...best.item,
      confidence: best.score,
      matchType: best.matchType
    };
  }

  return null;
}

// Specialized function for OCR text that may contain multiple product mentions
export function fuzzyMatchMultiple(
  ocrText: string,
  candidates: MatchCandidate[],
  maxResults = 3
): FuzzyMatchResult[] {
  const lines = ocrText.split('\n').map(line => line.trim()).filter(Boolean);
  const results: FuzzyMatchResult[] = [];
  const seenIds = new Set<string>();

  // Try to match each line
  for (const line of lines) {
    const match = fuzzyMatch(line, candidates);
    if (match && !seenIds.has(match.id)) {
      results.push(match);
      seenIds.add(match.id);
      
      if (results.length >= maxResults) break;
    }
  }

  // If no line matches found, try the full text
  if (results.length === 0) {
    const fullTextMatch = fuzzyMatch(ocrText, candidates);
    if (fullTextMatch) {
      results.push(fullTextMatch);
    }
  }

  // Sort by confidence descending
  return results.sort((a, b) => b.confidence - a.confidence);
}