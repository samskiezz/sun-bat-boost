import { compareTwoStrings } from 'string-similarity';

export interface MatchCandidate {
  id: string;
  brand: string;
  model: string;
  cec_id?: string;
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
    // Try brand + model match (highest priority)
    const brandModelScore = compareTwoStrings(
      query, 
      `${candidate.brand} ${candidate.model}`.toLowerCase()
    );
    
    // Try model only match
    const modelScore = compareTwoStrings(query, candidate.model.toLowerCase());
    
    // Try brand only match (lowest priority)
    const brandScore = compareTwoStrings(query, candidate.brand.toLowerCase());
    
    // Determine best match type and score
    if (brandModelScore > best.score) {
      best = { 
        score: brandModelScore, 
        item: candidate, 
        matchType: 'brand_model' 
      };
    } else if (modelScore > best.score) {
      best = { 
        score: modelScore, 
        item: candidate, 
        matchType: 'model_only' 
      };
    } else if (brandScore > best.score && brandScore > 0.8) {
      // Only consider brand matches if they're very high confidence
      best = { 
        score: brandScore, 
        item: candidate, 
        matchType: 'brand_only' 
      };
    }
  }

  // Return match if confidence is above threshold
  if (best.score >= 0.72 && best.item) {
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