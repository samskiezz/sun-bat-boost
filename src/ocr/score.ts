import { PanelCandidate, BatteryCandidate, Confidence } from './extract.types';

// Scoring weights
const WEIGHTS = {
  CONTEXT: {
    TABLE: 5,
    LINE: 4,
    HEADER: 2,
    FOOTER: 1,
    NOTE: 2,
  },
  COMPLETENESS: {
    BRAND_MODEL: 2,
    BRAND_ONLY: 1,
    MODEL_ONLY: 1,
    SPECS_COMPLETE: 3,
    SPECS_PARTIAL: 1,
  },
  CONSISTENCY: {
    PERFECT_MATCH: 3,
    CLOSE_MATCH: 1,
    CONFLICT: -2,
  },
  EVIDENCE: {
    MULTIPLE_SOURCES: 2,
    SINGLE_SOURCE: 0,
    FOOTER_ONLY: -1,
  },
};

// Calculate base score from evidence
const calculateEvidenceScore = (evidences: any[]): number => {
  let score = 0;
  
  // Context scoring
  const contexts = evidences.map(e => e.context);
  const hasTable = contexts.includes('TABLE');
  const hasLine = contexts.includes('LINE');
  const hasFooterOnly = contexts.every(c => c === 'FOOTER');
  
  if (hasTable) score += WEIGHTS.CONTEXT.TABLE;
  else if (hasLine) score += WEIGHTS.CONTEXT.LINE;
  else score += WEIGHTS.CONTEXT.FOOTER;
  
  // Multiple evidence bonus
  if (evidences.length > 1) score += WEIGHTS.EVIDENCE.MULTIPLE_SOURCES;
  if (hasFooterOnly) score += WEIGHTS.EVIDENCE.FOOTER_ONLY;
  
  return score;
};

// Score panel candidates
const scorePanelCandidate = (candidate: PanelCandidate): number => {
  let score = calculateEvidenceScore(candidate.evidences);
  
  // Completeness scoring
  if (candidate.brand && candidate.model) {
    score += WEIGHTS.COMPLETENESS.BRAND_MODEL;
  } else if (candidate.brand || candidate.model) {
    score += WEIGHTS.COMPLETENESS.BRAND_ONLY;
  }
  
  // Specs completeness
  const hasCount = candidate.count !== undefined;
  const hasWattage = candidate.wattage !== undefined;
  const hasArrayKw = candidate.arrayKwDc !== undefined;
  
  if (hasCount && hasWattage && hasArrayKw) {
    score += WEIGHTS.COMPLETENESS.SPECS_COMPLETE;
    
    // Consistency check: count × wattage should match arrayKw
    const calculatedKw = (candidate.count! * candidate.wattage!) / 1000;
    const diff = Math.abs(calculatedKw - candidate.arrayKwDc!);
    const percentDiff = diff / candidate.arrayKwDc!;
    
    if (percentDiff < 0.02) { // Within 2%
      score += WEIGHTS.CONSISTENCY.PERFECT_MATCH;
    } else if (percentDiff < 0.08) { // Within 8%
      score += WEIGHTS.CONSISTENCY.CLOSE_MATCH;
    } else {
      score += WEIGHTS.CONSISTENCY.CONFLICT;
    }
  } else if ((hasCount && hasWattage) || (hasCount && hasArrayKw) || (hasWattage && hasArrayKw)) {
    score += WEIGHTS.COMPLETENESS.SPECS_PARTIAL;
  }
  
  return score;
};

// Score battery candidates
const scoreBatteryCandidate = (candidate: BatteryCandidate): number => {
  let score = calculateEvidenceScore(candidate.evidences);
  
  // Completeness scoring
  if (candidate.brand && candidate.model) {
    score += WEIGHTS.COMPLETENESS.BRAND_MODEL;
  } else if (candidate.brand || candidate.model) {
    score += WEIGHTS.COMPLETENESS.BRAND_ONLY;
  }
  
  // Capacity completeness
  if (candidate.usableKWh) {
    score += WEIGHTS.COMPLETENESS.SPECS_COMPLETE;
  }
  
  // Stack consistency
  if (candidate.stack && candidate.stack.modules && candidate.stack.moduleKWh && candidate.usableKWh) {
    const stackTotal = candidate.stack.modules * candidate.stack.moduleKWh;
    const diff = Math.abs(stackTotal - candidate.usableKWh);
    const percentDiff = diff / candidate.usableKWh;
    
    if (percentDiff < 0.05) { // Within 5%
      score += WEIGHTS.CONSISTENCY.PERFECT_MATCH;
    } else if (percentDiff < 0.10) { // Within 10%
      score += WEIGHTS.CONSISTENCY.CLOSE_MATCH;
    } else {
      score += WEIGHTS.CONSISTENCY.CONFLICT;
    }
  }
  
  return score;
};

// Determine confidence level
const getConfidence = (bestScore: number, candidates: any[]): Confidence => {
  if (candidates.length === 0) return 'LOW';
  
  const scores = candidates.map(c => c.score).sort((a, b) => b - a);
  const secondBest = scores[1] || 0;
  const spread = bestScore - secondBest;
  
  if (bestScore >= 8 && spread >= 2) return 'HIGH';
  if (bestScore >= 5 && spread >= 1) return 'MEDIUM';
  return 'LOW';
};

// Generate warnings
const generateWarnings = (candidates: any[], type: 'panel' | 'battery'): string[] => {
  const warnings: string[] = [];
  
  if (candidates.length === 0) {
    warnings.push(`No ${type} candidates found`);
    return warnings;
  }
  
  const scores = candidates.map(c => c.score).sort((a, b) => b - a);
  const spread = scores[0] - (scores[1] || 0);
  
  if (spread < 1) {
    warnings.push(`Multiple ${type} candidates with similar scores - manual review recommended`);
  }
  
  const best = candidates.find(c => c.score === scores[0]);
  if (best) {
    const hasFooterEvidence = best.evidences.some((e: any) => e.context === 'FOOTER');
    const hasTableEvidence = best.evidences.some((e: any) => e.context === 'TABLE');
    
    if (hasFooterEvidence && !hasTableEvidence) {
      warnings.push(`${type} evidence found only in footer/marketing content`);
    }
    
    if (type === 'panel' && best.count && best.wattage && best.arrayKwDc) {
      const calculatedKw = (best.count * best.wattage) / 1000;
      const diff = Math.abs(calculatedKw - best.arrayKwDc);
      if (diff / best.arrayKwDc > 0.08) {
        warnings.push(`Panel array size mismatch: ${best.count}×${best.wattage}W ≠ ${best.arrayKwDc}kW`);
      }
    }
    
    if (type === 'battery' && best.stack && best.usableKWh) {
      const stackTotal = best.stack.modules * best.stack.moduleKWh;
      const diff = Math.abs(stackTotal - best.usableKWh);
      if (diff / best.usableKWh > 0.10) {
        warnings.push(`Battery capacity mismatch: ${best.stack.modules}×${best.stack.moduleKWh}kWh ≠ ${best.usableKWh}kWh`);
      }
    }
  }
  
  return warnings;
};

export const scoreCandidates = {
  panels: (candidates: PanelCandidate[]) => {
    // Score all candidates
    const scoredCandidates = candidates.map(candidate => ({
      ...candidate,
      score: scorePanelCandidate(candidate),
    }));
    
    // Sort by score
    scoredCandidates.sort((a, b) => b.score - a.score);
    
    const best = scoredCandidates[0];
    const confidence = getConfidence(best?.score || 0, scoredCandidates);
    const warnings = generateWarnings(scoredCandidates, 'panel');
    
    return {
      best,
      candidates: scoredCandidates,
      confidence,
      warnings,
    };
  },
  
  batteries: (candidates: BatteryCandidate[]) => {
    // Score all candidates
    const scoredCandidates = candidates.map(candidate => ({
      ...candidate,
      score: scoreBatteryCandidate(candidate),
    }));
    
    // Sort by score
    scoredCandidates.sort((a, b) => b.score - a.score);
    
    const best = scoredCandidates[0];
    const confidence = getConfidence(best?.score || 0, scoredCandidates);
    const warnings = generateWarnings(scoredCandidates, 'battery');
    
    return {
      best,
      candidates: scoredCandidates,
      confidence,
      warnings,
    };
  },
};