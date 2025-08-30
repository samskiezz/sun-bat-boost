// ML-Powered Matching Engine

import type { 
  MatchCandidate, 
  MatchResult, 
  GeoPolygon, 
  PolyMatch 
} from '@/types/geo';
import { vectIndexSearch } from './vector-index';
import { mlEmbedSite, mlEmbedSpec, mlEmbedBill, mlEmbedTariff } from './embeddings';
import { supabase } from '@/integrations/supabase/client';

export async function rankMatches(
  candidates: MatchCandidate[], 
  strategy: 'cosine' | 'hybrid' | 'semantic' = 'hybrid'
): Promise<MatchCandidate[]> {
  const ranked = [...candidates];
  
  switch (strategy) {
    case 'cosine':
      return ranked.sort((a, b) => (b.score || 0) - (a.score || 0));
    
    case 'semantic':
      // Boost matches with similar semantic properties
      return ranked.sort((a, b) => {
        const aBoost = getSemanticBoost(a);
        const bBoost = getSemanticBoost(b);
        return (b.score || 0) * bBoost - (a.score || 0) * aBoost;
      });
    
    case 'hybrid':
    default:
      return ranked.sort((a, b) => {
        const aScore = (a.score || 0) * getSemanticBoost(a) * getContextBoost(a);
        const bScore = (b.score || 0) * getSemanticBoost(b) * getContextBoost(b);
        return bScore - aScore;
      });
  }
}

export async function resolveMatchConflicts(
  matches: MatchResult[]
): Promise<MatchResult[]> {
  // Remove duplicate matches and resolve conflicts
  const seen = new Set<string>();
  const resolved: MatchResult[] = [];
  
  for (const match of matches) {
    const deduped = match.matches.filter(candidate => {
      const key = `${candidate.id}-${match.source_id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    
    if (deduped.length > 0) {
      resolved.push({
        ...match,
        matches: deduped
      });
    }
  }
  
  return resolved;
}

export async function matchPolygonToRoofDB(polygon: GeoPolygon): Promise<PolyMatch[]> {
  try {
    // Generate embedding for the polygon
    const embedding = await mlEmbedSite(polygon, {});
    
    // Search for similar roof polygons
    const candidates = await vectIndexSearch(embedding, 5, { 
      kind: 'roof_polygon' 
    });
    
    const ranked = await rankMatches(candidates, 'hybrid');
    
    return ranked.map(candidate => ({
      target_id: candidate.id,
      score: candidate.score || 0,
      confidence: Math.min((candidate.score || 0) * 1.2, 1.0),
      features: {
        geometric: {
          area_sqm: candidate.meta.area_sqm || 0,
          perimeter_m: candidate.meta.perimeter_m || 0,
          centroid: candidate.meta.centroid || { lat: 0, lng: 0 },
          bounds: candidate.meta.bounds || { north: 0, south: 0, east: 0, west: 0 },
          compactness: candidate.meta.compactness || 0,
          aspect_ratio: candidate.meta.aspect_ratio || 1
        }
      },
      meta: candidate.meta
    }));
  } catch (error) {
    console.error('Polygon matching failed:', error);
    return [];
  }
}

export async function matchOcrToCatalog(ocrFields: Record<string, any>): Promise<MatchResult> {
  try {
    // Create a synthetic spec object from OCR fields
    const specEmbedding = await mlEmbedSpec(ocrFields);
    
    // Search for similar products in catalog
    const candidates = await vectIndexSearch(specEmbedding, 10, { 
      kind: 'product_spec' 
    });
    
    const ranked = await rankMatches(candidates, 'semantic');
    
    return {
      source_id: 'ocr_extraction',
      matches: ranked,
      strategy: 'semantic_spec_matching',
      timestamp: new Date().toISOString(),
      total_candidates: candidates.length
    };
  } catch (error) {
    console.error('OCR to catalog matching failed:', error);
    return {
      source_id: 'ocr_extraction',
      matches: [],
      strategy: 'fallback',
      timestamp: new Date().toISOString(),
      total_candidates: 0
    };
  }
}

export async function matchBillToTariffPlan(
  ocr: Record<string, any>, 
  postcode: string
): Promise<MatchResult> {
  try {
    // Extract bill text for embedding
    const billText = JSON.stringify(ocr);
    const billEmbedding = await mlEmbedBill(billText);
    
    // Search for similar tariff plans
    const candidates = await vectIndexSearch(billEmbedding, 15, { 
      kind: 'tariff_plan' 
    });
    
    // Filter by postcode/location if available
    const locationFiltered = candidates.filter(candidate => {
      const planPostcode = candidate.meta.postcode;
      return !planPostcode || planPostcode === postcode || 
             Math.abs(parseInt(planPostcode) - parseInt(postcode)) < 100;
    });
    
    const ranked = await rankMatches(locationFiltered, 'hybrid');
    
    return {
      source_id: `bill_ocr_${postcode}`,
      matches: ranked,
      strategy: 'bill_to_tariff_matching',
      timestamp: new Date().toISOString(),
      total_candidates: candidates.length
    };
  } catch (error) {
    console.error('Bill to tariff matching failed:', error);
    return {
      source_id: `bill_ocr_${postcode}`,
      matches: [],
      strategy: 'fallback',
      timestamp: new Date().toISOString(),
      total_candidates: 0
    };
  }
}

export async function matchSiteToVppPlan(siteFeatures: Record<string, any>): Promise<MatchResult> {
  try {
    // Create site polygon from features if available
    const polygon = siteFeatures.polygon || {
      coordinates: [
        { lat: -33.8688, lng: 151.2093 }, // Default Sydney location
        { lat: -33.8688, lng: 151.2100 },
        { lat: -33.8700, lng: 151.2100 },
        { lat: -33.8700, lng: 151.2093 },
        { lat: -33.8688, lng: 151.2093 }
      ]
    };
    
    const siteEmbedding = await mlEmbedSite(polygon, siteFeatures);
    
    // Search for compatible VPP plans
    const candidates = await vectIndexSearch(siteEmbedding, 8, { 
      kind: 'vpp_plan' 
    });
    
    // Apply VPP-specific ranking
    const vppRanked = candidates.map(candidate => ({
      ...candidate,
      score: (candidate.score || 0) * getVppCompatibilityScore(candidate, siteFeatures)
    }));
    
    const ranked = await rankMatches(vppRanked, 'hybrid');
    
    return {
      source_id: siteFeatures.site_id || 'unknown_site',
      matches: ranked,
      strategy: 'site_to_vpp_matching',
      timestamp: new Date().toISOString(),
      total_candidates: candidates.length
    };
  } catch (error) {
    console.error('Site to VPP matching failed:', error);
    return {
      source_id: siteFeatures.site_id || 'unknown_site',
      matches: [],
      strategy: 'fallback',
      timestamp: new Date().toISOString(),
      total_candidates: 0
    };
  }
}

export async function matchSpecToCatalog(specJson: Record<string, any>): Promise<MatchResult> {
  try {
    const specEmbedding = await mlEmbedSpec(specJson);
    
    // Search in product catalog
    const candidates = await vectIndexSearch(specEmbedding, 20, { 
      kind: 'catalog_product' 
    });
    
    // Apply spec-specific filtering
    const filtered = candidates.filter(candidate => {
      const candidateSpec = candidate.meta;
      
      // Power rating tolerance (±20%)
      const power = parseFloat(specJson.power_w || '0');
      const candidatePower = parseFloat(candidateSpec.power_w || '0');
      if (power > 0 && candidatePower > 0) {
        const powerDiff = Math.abs(power - candidatePower) / power;
        if (powerDiff > 0.2) return false;
      }
      
      // Technology type match
      const tech = (specJson.technology || '').toLowerCase();
      const candidateTech = (candidateSpec.technology || '').toLowerCase();
      if (tech && candidateTech && tech !== candidateTech) {
        return false;
      }
      
      return true;
    });
    
    const ranked = await rankMatches(filtered, 'semantic');
    
    // Store match results for audit
    await storeMatchResults('spec_to_catalog', specJson.id || 'unknown', ranked);
    
    return {
      source_id: specJson.id || 'unknown_spec',
      matches: ranked,
      strategy: 'spec_to_catalog_matching',
      timestamp: new Date().toISOString(),
      total_candidates: candidates.length
    };
  } catch (error) {
    console.error('Spec to catalog matching failed:', error);
    return {
      source_id: specJson.id || 'unknown_spec',
      matches: [],
      strategy: 'fallback',
      timestamp: new Date().toISOString(),
      total_candidates: 0
    };
  }
}

// Helper functions
function getSemanticBoost(candidate: MatchCandidate): number {
  let boost = 1.0;
  
  // Boost recent entries
  const createdAt = candidate.meta.created_at || candidate.meta.timestamp;
  if (createdAt) {
    const daysSinceCreated = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
    boost *= Math.max(0.5, 1 - daysSinceCreated / 365); // Decay over a year
  }
  
  // Boost high-quality entries
  const quality = candidate.meta.quality_score || 0.5;
  boost *= (0.5 + quality);
  
  return boost;
}

function getContextBoost(candidate: MatchCandidate): number {
  let boost = 1.0;
  
  // Boost verified/approved entries
  if (candidate.meta.verified || candidate.meta.approved) {
    boost *= 1.2;
  }
  
  // Boost entries with complete metadata
  const metaKeys = Object.keys(candidate.meta || {});
  if (metaKeys.length > 5) {
    boost *= 1.1;
  }
  
  return boost;
}

function getVppCompatibilityScore(candidate: MatchCandidate, siteFeatures: Record<string, any>): number {
  let score = 1.0;
  
  const vppPlan = candidate.meta;
  
  // Check minimum system size
  const systemSize = siteFeatures.system_size_kw || 0;
  const minSize = vppPlan.min_system_size_kw || 0;
  if (systemSize < minSize) {
    score *= 0.3;
  }
  
  // Check battery requirements
  const hasBattery = siteFeatures.has_battery || false;
  const requiresBattery = vppPlan.requires_battery || false;
  if (requiresBattery && !hasBattery) {
    score *= 0.1;
  }
  
  // Geographic eligibility
  const postcode = siteFeatures.postcode;
  const eligiblePostcodes = vppPlan.eligible_postcodes || [];
  if (eligiblePostcodes.length > 0 && postcode && !eligiblePostcodes.includes(postcode)) {
    score *= 0.2;
  }
  
  return score;
}

async function storeMatchResults(
  kind: string, 
  sourceId: string, 
  matches: MatchCandidate[]
): Promise<void> {
  try {
    const records = matches.map(match => ({
      source_id: sourceId,
      target_id: match.id,
      score: match.score || 0,
      kind,
      meta: {
        strategy: 'ml_embedding',
        candidate_kind: match.kind,
        timestamp: new Date().toISOString(),
        ...match.meta
      }
    }));
    
    await supabase.from('ml_matches').insert(records);
  } catch (error) {
    console.error('Failed to store match results:', error);
  }
}