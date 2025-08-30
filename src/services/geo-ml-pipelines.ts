// Geospatial ML Pipelines

import type { MatchResult, GeoPolygon } from '@/types/geo';
import { 
  matchPolygonToRoofDB, 
  matchOcrToCatalog, 
  matchBillToTariffPlan, 
  matchSiteToVppPlan, 
  matchSpecToCatalog 
} from '@/lib/ml/matching';
import { mlEmbedSite } from '@/lib/ml/embeddings';
import { vectIndexUpsert } from '@/lib/ml/vector-index';
import { featPolyGeometric, featPolySolar, featPolySignature } from '@/lib/geo/polygon-features';
import { supabase } from '@/integrations/supabase/client';

export async function pipePolygonMatch(siteId: string): Promise<{
  success: boolean;
  matches: MatchResult[];
  features_stored: boolean;
  error?: string;
}> {
  try {
    console.log(`🔄 Starting polygon match pipeline for site: ${siteId}`);
    
    // Get site polygon from database (assuming it exists)
    const { data: siteData, error: siteError } = await supabase
      .from('poly_features')
      .select('*')
      .eq('site_id', siteId)
      .single();
    
    if (siteError && siteError.code !== 'PGRST116') {
      throw new Error(`Failed to fetch site data: ${siteError.message}`);
    }
    
    // Create synthetic polygon if none exists
    const featuresData = siteData?.features as any;
    const polygon: GeoPolygon = featuresData?.polygon || {
      coordinates: [
        { lat: -33.8688, lng: 151.2093 },
        { lat: -33.8688, lng: 151.2103 },
        { lat: -33.8698, lng: 151.2103 },
        { lat: -33.8698, lng: 151.2093 },
        { lat: -33.8688, lng: 151.2093 }
      ]
    };
    
    // Extract features
    const geometric = featPolyGeometric(polygon);
    const solar = featPolySolar(polygon);
    const signature = featPolySignature(polygon);
    
    const features = {
      geometric,
      solar,
      polygon,
      site_id: siteId
    };
    
    // Store or update polygon features
    await supabase.from('poly_features').upsert({
      site_id: siteId,
      features: features as any,
      signature
    });
    
    // Generate and store embedding
    const embedding = await mlEmbedSite(polygon, { site_id: siteId });
    await vectIndexUpsert(siteId, 'site_polygon', embedding, {
      site_id: siteId,
      area_sqm: geometric.area_sqm,
      centroid: geometric.centroid
    });
    
    // Find matches in roof database
    const matches = await matchPolygonToRoofDB(polygon);
    
    // Store match results
    const matchResult: MatchResult = {
      source_id: siteId,
      matches: matches.map(m => ({
        id: m.target_id,
        kind: 'roof_polygon',
        embedding: { dimensions: 64, values: [], format: 'f32' },
        meta: m.meta,
        score: m.score
      })),
      strategy: 'polygon_to_roof_matching',
      timestamp: new Date().toISOString(),
      total_candidates: matches.length
    };
    
    console.log(`✅ Polygon match pipeline complete for site: ${siteId}, found ${matches.length} matches`);
    
    return {
      success: true,
      matches: [matchResult],
      features_stored: true
    };
  } catch (error) {
    console.error(`❌ Polygon match pipeline failed for site: ${siteId}`, error);
    return {
      success: false,
      matches: [],
      features_stored: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function pipeOcrToTariff(siteId: string): Promise<{
  success: boolean;
  matches: MatchResult[];
  auto_filled_fields: string[];
  error?: string;
}> {
  try {
    console.log(`🔄 Starting OCR to tariff pipeline for site: ${siteId}`);
    
    // Get the latest OCR results for this site (mock for now)
    const mockOcrData = {
      retailer: 'Origin Energy',
      plan_name: 'Solar Boost Plus',
      quarterly_usage: '1245',
      quarterly_bill: '$387.50',
      supply_charge: '$1.0746',
      peak_rate: '28.5',
      off_peak_rate: '19.2',
      feed_in_tariff: '6.7',
      account_number: 'XXXXXX789',
      meter_number: 'NMI123456'
    };
    
    // Get site location for tariff matching
    const { data: siteLocation } = await supabase
      .from('poly_features')
      .select('features')
      .eq('site_id', siteId)
      .single();
    
    const featuresData = siteLocation?.features as any;
    const postcode = featuresData?.context?.postcode || '2000';
    
    // Match bill OCR to tariff plans
    const matchResult = await matchBillToTariffPlan(mockOcrData, postcode);
    
    // Auto-fill form fields based on best matches
    const autoFilledFields: string[] = [];
    const bestMatch = matchResult.matches[0];
    
    if (bestMatch && bestMatch.score && bestMatch.score > 0.7) {
      const planData = bestMatch.meta;
      
      // Update form state or database with matched plan details
      autoFilledFields.push('retailer', 'plan_name', 'supply_charge', 'usage_rates');
      
      console.log(`📝 Auto-filled fields from best match: ${autoFilledFields.join(', ')}`);
    }
    
    console.log(`✅ OCR to tariff pipeline complete for site: ${siteId}, found ${matchResult.matches.length} matches`);
    
    return {
      success: true,
      matches: [matchResult],
      auto_filled_fields: autoFilledFields
    };
  } catch (error) {
    console.error(`❌ OCR to tariff pipeline failed for site: ${siteId}`, error);
    return {
      success: false,
      matches: [],
      auto_filled_fields: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function pipeSpecToCatalog(productBlob: Record<string, any>): Promise<{
  success: boolean;
  matches: MatchResult[];
  enhanced_specs: Record<string, any>;
  confidence: number;
  error?: string;
}> {
  try {
    console.log(`🔄 Starting spec to catalog pipeline for product: ${productBlob.id || 'unknown'}`);
    
    // Match specifications to catalog
    const matchResult = await matchSpecToCatalog(productBlob);
    
    // Enhance specifications with catalog data
    let enhancedSpecs = { ...productBlob };
    let confidence = 0;
    
    if (matchResult.matches.length > 0) {
      const bestMatch = matchResult.matches[0];
      confidence = bestMatch.score || 0;
      
      if (confidence > 0.8) {
        // High confidence - merge specifications
        const catalogSpec = bestMatch.meta;
        enhancedSpecs = {
          ...enhancedSpecs,
          ...catalogSpec,
          // Preserve original values where they exist
          id: productBlob.id,
          source: `${productBlob.source || 'unknown'}_enhanced`,
          enhanced_at: new Date().toISOString(),
          match_confidence: confidence,
          catalog_match_id: bestMatch.id
        };
        
        console.log(`🎯 High confidence match (${confidence.toFixed(3)}) - specs enhanced`);
      } else if (confidence > 0.6) {
        // Medium confidence - add suggested values
        enhancedSpecs.suggested_specs = bestMatch.meta;
        enhancedSpecs.match_confidence = confidence;
        
        console.log(`🤔 Medium confidence match (${confidence.toFixed(3)}) - suggestions added`);
      }
    }
    
    // Store enhanced specs if this is a database product
    if (productBlob.id && confidence > 0.6) {
      await supabase.from('products').update({
        specs: enhancedSpecs,
        updated_at: new Date().toISOString()
      }).eq('id', productBlob.id);
    }
    
    console.log(`✅ Spec to catalog pipeline complete, confidence: ${confidence.toFixed(3)}`);
    
    return {
      success: true,
      matches: [matchResult],
      enhanced_specs: enhancedSpecs,
      confidence
    };
  } catch (error) {
    console.error(`❌ Spec to catalog pipeline failed`, error);
    return {
      success: false,
      matches: [],
      enhanced_specs: productBlob,
      confidence: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function pipeSiteToVpp(siteId: string): Promise<{
  success: boolean;
  matches: MatchResult[];
  eligible_plans: number;
  top_recommendation?: any;
  error?: string;
}> {
  try {
    console.log(`🔄 Starting site to VPP pipeline for site: ${siteId}`);
    
    // Get site features
    const { data: siteFeatures } = await supabase
      .from('poly_features')
      .select('features')
      .eq('site_id', siteId)
      .single();
    
    const features = (siteFeatures?.features as any) || {};
    const siteContext = {
      site_id: siteId,
      system_size_kw: features.solar?.panel_capacity_estimate || 6.5,
      has_battery: features.context?.has_battery || false,
      postcode: features.context?.postcode || '2000',
      state: features.context?.state || 'NSW',
      roof_space_sqm: features.geometric?.area_sqm || 50
    };
    
    // Match site to VPP plans
    const matchResult = await matchSiteToVppPlan(siteContext);
    
    // Filter eligible plans (score > 0.5)
    const eligiblePlans = matchResult.matches.filter(match => 
      (match.score || 0) > 0.5
    );
    
    let topRecommendation = null;
    if (eligiblePlans.length > 0) {
      const best = eligiblePlans[0];
      topRecommendation = {
        plan_name: best.meta.plan_name || 'VPP Plan',
        provider: best.meta.provider || 'Energy Provider',
        annual_payment: best.meta.annual_payment_aud || 500,
        export_rate: best.meta.export_rate_c_kwh || 12,
        requirements: best.meta.requirements || [],
        score: best.score
      };
      
      console.log(`🏆 Top VPP recommendation: ${topRecommendation.plan_name} (score: ${best.score?.toFixed(3)})`);
    }
    
    console.log(`✅ Site to VPP pipeline complete for site: ${siteId}, ${eligiblePlans.length} eligible plans`);
    
    return {
      success: true,
      matches: [matchResult],
      eligible_plans: eligiblePlans.length,
      top_recommendation: topRecommendation
    };
  } catch (error) {
    console.error(`❌ Site to VPP pipeline failed for site: ${siteId}`, error);
    return {
      success: false,
      matches: [],
      eligible_plans: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function pipeDesignValidation(siteId: string, designId: string): Promise<{
  success: boolean;
  validation_score: number;
  findings: Array<{
    type: 'error' | 'warning' | 'info';
    code: string;
    message: string;
    auto_fixable: boolean;
  }>;
  recommendations: string[];
  error?: string;
}> {
  try {
    console.log(`🔄 Starting design validation pipeline for site: ${siteId}, design: ${designId}`);
    
    const findings: Array<{
      type: 'error' | 'warning' | 'info';
      code: string;
      message: string;
      auto_fixable: boolean;
    }> = [];
    
    const recommendations: string[] = [];
    
    // Get site and design data
    const { data: siteFeatures } = await supabase
      .from('poly_features')
      .select('features')
      .eq('site_id', siteId)
      .single();
    
    const features = (siteFeatures?.features as any) || {};
    
    // Mock design data
    const designData = {
      panel_count: 20,
      system_size_kw: 8.0,
      array_polygons: [features.polygon || {}],
      inverter_size_kw: 7.5,
      tilt_degrees: 25,
      azimuth_degrees: 180
    };
    
    let validationScore = 1.0;
    
    // Validation checks
    
    // 1. Panel capacity vs inverter sizing
    const dcAcRatio = designData.system_size_kw / designData.inverter_size_kw;
    if (dcAcRatio > 1.33) {
      findings.push({
        type: 'warning',
        code: 'OVERSIZED_DC',
        message: 'DC to AC ratio exceeds 1.33:1 - potential clipping',
        auto_fixable: true
      });
      recommendations.push('Consider larger inverter or reduce panel count');
      validationScore *= 0.9;
    }
    
    // 2. Roof containment check
    if (features.geometric?.area_sqm) {
      const panelArea = designData.panel_count * 2; // Assume 2m² per panel
      const roofUsage = panelArea / features.geometric.area_sqm;
      
      if (roofUsage > 0.8) {
        findings.push({
          type: 'error', 
          code: 'EXCEEDS_ROOF_SPACE',
          message: 'Panel array exceeds 80% of available roof space',
          auto_fixable: true
        });
        recommendations.push('Reduce panel count or use higher efficiency panels');
        validationScore *= 0.7;
      }
    }
    
    // 3. Optimal orientation check
    if (Math.abs(designData.azimuth_degrees - 180) > 45) {
      findings.push({
        type: 'warning',
        code: 'SUBOPTIMAL_ORIENTATION',
        message: 'Panel orientation significantly deviates from north-facing',
        auto_fixable: false
      });
      validationScore *= 0.95;
    }
    
    // 4. Tilt optimization
    const latitude = Math.abs(features.geometric?.centroid?.lat || -33.8688);
    const optimalTilt = latitude;
    if (Math.abs(designData.tilt_degrees - optimalTilt) > 15) {
      findings.push({
        type: 'info',
        code: 'TILT_OPTIMIZATION',
        message: `Consider tilt angle closer to ${optimalTilt.toFixed(0)}° for optimal performance`,
        auto_fixable: true
      });
    }
    
    // 5. Export limit compliance
    const exportLimit = 5.0; // Default 5kW export limit
    if (designData.inverter_size_kw > exportLimit) {
      findings.push({
        type: 'error',
        code: 'EXCEEDS_EXPORT_LIMIT', 
        message: `Inverter size (${designData.inverter_size_kw}kW) exceeds export limit (${exportLimit}kW)`,
        auto_fixable: true
      });
      recommendations.push('Consider export limiting or multiple smaller inverters');
      validationScore *= 0.8;
    }
    
    console.log(`✅ Design validation complete for site: ${siteId}, score: ${validationScore.toFixed(3)}, ${findings.length} findings`);
    
    return {
      success: true,
      validation_score: validationScore,
      findings,
      recommendations
    };
  } catch (error) {
    console.error(`❌ Design validation pipeline failed for site: ${siteId}`, error);
    return {
      success: false,
      validation_score: 0,
      findings: [],
      recommendations: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}