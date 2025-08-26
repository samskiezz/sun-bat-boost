import { OCRDeltas, DesignResult } from './types';

export function rewardFromOcr(deltas: OCRDeltas): number {
  const base = deltas.correct * 1 - deltas.incorrect * 2 - deltas.missed * 1;
  const cite = deltas.docSpansCaptured ? 0.2 : 0;
  return Math.max(-10, Math.min(10, base + cite)); // Clamp rewards
}

export function rewardFromDesign(results: DesignResult): number {
  const validChosen = results.valid.length > 0;
  const ok = validChosen ? 2 : -3;
  
  if (!validChosen) return ok;
  
  const best = results.valid[0];
  const ratio = scoreDcAc(best.dcAc);
  const head = scoreHeadroom(best.backupH);
  const center = scoreVoltageCentering(best.stackVsWindow);
  const explain = best.hasCitations ? 0.3 : 0;
  const blocked = results.invalid.length > 0 ? 0.5 : -0.5; // Reward finding invalid options
  
  return Math.max(-10, Math.min(10, ok + ratio + head + center + explain + blocked));
}

export function scoreDcAc(ratio: number): number {
  // Optimal DC:AC ratio is 1.1-1.3
  if (ratio >= 1.1 && ratio <= 1.3) return 1.0;
  if (ratio >= 1.0 && ratio <= 1.4) return 0.5;
  if (ratio >= 0.9 && ratio <= 1.5) return 0.2;
  return 0;
}

export function scoreHeadroom(headroom: number): number {
  // 20% headroom is ideal for backup systems
  if (headroom >= 0.2) return 1.0;
  if (headroom >= 0.1) return 0.6;
  if (headroom >= 0.05) return 0.3;
  return 0;
}

export function scoreVoltageCentering(window: { center: number; span: number }): number {
  // Reward voltage centering in MPPT window
  const centerScore = Math.min(1, window.center / (window.span / 2));
  return Math.max(0, centerScore - 0.1); // Small penalty to encourage centering
}

export function scoreRuleCompliance(violations: any[]): number {
  // Penalize each rule violation
  const baseScore = 1.0;
  const violationPenalty = violations.length * 0.3;
  return Math.max(0, baseScore - violationPenalty);
}

export function scoreExplainability(citations: any[]): number {
  // Reward systems that can explain their choices
  if (!citations || citations.length === 0) return 0;
  
  const citationScore = Math.min(1, citations.length / 3); // Diminishing returns
  const completenessScore = citations.every(c => c.page && c.text) ? 0.2 : 0;
  
  return citationScore + completenessScore;
}

export function scoreInnovation(design: any, historicalDesigns: any[]): number {
  // Reward novel but valid design approaches
  if (historicalDesigns.length === 0) return 0;
  
  // Simple novelty check - different from recent designs
  const isNovel = !historicalDesigns.slice(-10).some(hist => 
    Math.abs(hist.dcAcRatio - design.dcAc) < 0.1 &&
    Math.abs(hist.backupHeadroom - design.backupH) < 0.05
  );
  
  return isNovel ? 0.1 : 0;
}

export function calculateCompositeReward(
  ocrDeltas?: OCRDeltas,
  designResults?: DesignResult,
  ruleCompliance?: any[],
  citations?: any[],
  historicalDesigns?: any[]
): number {
  let totalReward = 0;
  let components = 0;
  
  // OCR component
  if (ocrDeltas) {
    totalReward += rewardFromOcr(ocrDeltas);
    components++;
  }
  
  // Design component
  if (designResults) {
    totalReward += rewardFromDesign(designResults);
    components++;
  }
  
  // Rule compliance bonus
  if (ruleCompliance) {
    totalReward += scoreRuleCompliance(ruleCompliance);
  }
  
  // Explainability bonus
  if (citations) {
    totalReward += scoreExplainability(citations);
  }
  
  // Innovation bonus
  if (designResults && historicalDesigns) {
    totalReward += scoreInnovation(designResults.valid[0], historicalDesigns);
  }
  
  return components > 0 ? totalReward / components : 0;
}

export interface RewardBreakdown {
  total: number;
  ocr?: number;
  design?: number;
  compliance?: number;
  explainability?: number;
  innovation?: number;
}

export function calculateDetailedReward(
  ocrDeltas?: OCRDeltas,
  designResults?: DesignResult,
  ruleCompliance?: any[],
  citations?: any[],
  historicalDesigns?: any[]
): RewardBreakdown {
  const breakdown: RewardBreakdown = { total: 0 };
  
  if (ocrDeltas) {
    breakdown.ocr = rewardFromOcr(ocrDeltas);
    breakdown.total += breakdown.ocr;
  }
  
  if (designResults) {
    breakdown.design = rewardFromDesign(designResults);
    breakdown.total += breakdown.design;
  }
  
  if (ruleCompliance) {
    breakdown.compliance = scoreRuleCompliance(ruleCompliance);
    breakdown.total += breakdown.compliance;
  }
  
  if (citations) {
    breakdown.explainability = scoreExplainability(citations);
    breakdown.total += breakdown.explainability;
  }
  
  if (designResults && historicalDesigns) {
    breakdown.innovation = scoreInnovation(designResults.valid[0], historicalDesigns);
    breakdown.total += breakdown.innovation;
  }
  
  return breakdown;
}