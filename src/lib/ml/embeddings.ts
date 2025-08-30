// ML Embeddings Generation

import type { VectorEmbedding, GeoPolygon, PolyFeatures } from '@/types/geo';

// Simple embedding cache
const embeddingCache = new Map<string, VectorEmbedding>();

export function mlEmbedBill(textBlob: string): Promise<VectorEmbedding> {
  return memoizeEmbedding(textBlob, () => {
    // Extract numerical features from bill text
    const features: number[] = [];
    
    // Usage patterns
    const usageMatch = textBlob.match(/(\d+(?:\.\d+)?)\s*kwh/gi);
    const usage = usageMatch ? parseFloat(usageMatch[0]) : 0;
    features.push(Math.log(usage + 1) / 10); // Normalized log usage
    
    // Cost patterns
    const costMatch = textBlob.match(/\$(\d+(?:\.\d+)?)/g);
    const cost = costMatch ? parseFloat(costMatch[0].replace('$', '')) : 0;
    features.push(Math.log(cost + 1) / 10);
    
    // Rate extraction
    const rateMatch = textBlob.match(/(\d+(?:\.\d+)?)\s*c\/kwh/gi);
    const rate = rateMatch ? parseFloat(rateMatch[0]) : 25;
    features.push(rate / 100); // Normalize to 0-1 range
    
    // Time-of-use indicators
    features.push(textBlob.toLowerCase().includes('peak') ? 1 : 0);
    features.push(textBlob.toLowerCase().includes('off-peak') ? 1 : 0);
    features.push(textBlob.toLowerCase().includes('shoulder') ? 1 : 0);
    
    // Supply charge
    const supplyMatch = textBlob.match(/supply.*?(\d+(?:\.\d+)?)/gi);
    const supply = supplyMatch ? parseFloat(supplyMatch[0].match(/\d+(?:\.\d+)?/)?.[0] || '1') : 1;
    features.push(supply / 100);
    
    // Pad to fixed dimension
    while (features.length < 64) {
      features.push(0);
    }
    
    return {
      dimensions: features.length,
      values: features.slice(0, 64),
      format: 'f32'
    };
  });
}

export function mlEmbedSpec(specJson: Record<string, any>): Promise<VectorEmbedding> {
  const cacheKey = JSON.stringify(specJson);
  return memoizeEmbedding(cacheKey, () => {
    const features: number[] = [];
    
    // Power rating
    const power = parseFloat(specJson.power_w || specJson.watts || specJson.power || '0');
    features.push(power / 1000); // Normalize to kW
    
    // Efficiency
    const efficiency = parseFloat(specJson.efficiency || specJson.efficiency_percent || '20');
    features.push(efficiency / 100);
    
    // Voltage
    const voltage = parseFloat(specJson.voltage || specJson.voc || specJson.v_oc || '40');
    features.push(voltage / 100);
    
    // Current
    const current = parseFloat(specJson.current || specJson.isc || specJson.i_sc || '10');
    features.push(current / 20);
    
    // Dimensions
    const length = parseFloat(specJson.length_mm || specJson.length || '2000');
    const width = parseFloat(specJson.width_mm || specJson.width || '1000');
    features.push(length / 3000);
    features.push(width / 2000);
    
    // Technology type (one-hot encoding)
    const tech = (specJson.technology || specJson.cell_type || '').toLowerCase();
    features.push(tech.includes('mono') ? 1 : 0);
    features.push(tech.includes('poly') ? 1 : 0);
    features.push(tech.includes('thin') ? 1 : 0);
    features.push(tech.includes('bifacial') ? 1 : 0);
    
    // Temperature coefficients
    const tempCoeff = parseFloat(specJson.temp_coeff_power || specJson.temperature_coefficient || '-0.4');
    features.push((tempCoeff + 1) / 2); // Normalize around -0.4
    
    // Warranty
    const warranty = parseFloat(specJson.warranty_years || specJson.warranty || '25');
    features.push(warranty / 30);
    
    // Brand reputation (simplified)
    const brand = (specJson.brand || specJson.manufacturer || '').toLowerCase();
    const tierOneBrands = ['sunpower', 'lg', 'panasonic', 'rec', 'jinko', 'trina'];
    features.push(tierOneBrands.some(b => brand.includes(b)) ? 1 : 0.5);
    
    // Pad to fixed dimension
    while (features.length < 64) {
      features.push(0);
    }
    
    return {
      dimensions: features.length,
      values: features.slice(0, 64),
      format: 'f32'
    };
  });
}

export function mlEmbedSite(polygon: GeoPolygon, context: Record<string, any>): Promise<VectorEmbedding> {
  const cacheKey = JSON.stringify({ polygon, context });
  return memoizeEmbedding(cacheKey, () => {
    const features: number[] = [];
    
    // Import feature extraction functions
    const { featPolyGeometric, featPolySolar, featPolyContext } = require('../geo/polygon-features');
    
    const geometric = featPolyGeometric(polygon);
    const solar = featPolySolar(polygon, context.tilt, context.azimuth, context.shade_index);
    const ctx = featPolyContext(context);
    
    // Geometric features
    features.push(Math.log(geometric.area_sqm + 1) / 15); // Normalized log area
    features.push(Math.log(geometric.perimeter_m + 1) / 10);
    features.push(geometric.compactness);
    features.push(Math.min(geometric.aspect_ratio, 5) / 5);
    
    // Location features
    features.push(geometric.centroid.lat / 90); // Normalize latitude
    features.push((geometric.centroid.lng + 180) / 360); // Normalize longitude
    
    // Solar features
    if (solar) {
      features.push(solar.tilt_degrees / 90);
      features.push(solar.azimuth_degrees / 360);
      features.push(solar.shade_index);
      features.push(solar.annual_irradiance_kwh_m2 / 2000);
      features.push(solar.panel_capacity_estimate / 50);
    } else {
      features.push(...Array(5).fill(0));
    }
    
    // Context features
    if (ctx) {
      // State encoding (simplified)
      const stateMap: Record<string, number> = {
        'nsw': 0.1, 'vic': 0.2, 'qld': 0.3, 'sa': 0.4, 'wa': 0.5, 
        'tas': 0.6, 'nt': 0.7, 'act': 0.8
      };
      features.push(stateMap[ctx.state?.toLowerCase() || ''] || 0);
      
      // Postcode (normalized)
      const postcode = parseInt(ctx.postcode || '0');
      features.push(postcode / 10000);
      
      // Meter type
      features.push(ctx.meter_type === 'TOU' ? 1 : 0);
      features.push(ctx.meter_type === 'FLAT' ? 1 : 0);
      
      // Building age
      features.push((ctx.building_age || 20) / 100);
    } else {
      features.push(...Array(5).fill(0));
    }
    
    // Pad to fixed dimension
    while (features.length < 64) {
      features.push(0);
    }
    
    return {
      dimensions: features.length,
      values: features.slice(0, 64),
      format: 'f32'
    };
  });
}

export function mlEmbedTariff(planJson: Record<string, any>): Promise<VectorEmbedding> {
  const cacheKey = JSON.stringify(planJson);
  return memoizeEmbedding(cacheKey, () => {
    const features: number[] = [];
    
    // Supply charge
    const supply = parseFloat(planJson.supply_c_per_day || planJson.daily_supply || '100');
    features.push(supply / 200); // Normalize supply charge
    
    // Usage rates
    const peak = parseFloat(planJson.usage_c_per_kwh_peak || planJson.peak_rate || '30');
    const offpeak = parseFloat(planJson.usage_c_per_kwh_offpeak || planJson.offpeak_rate || '20');
    const shoulder = parseFloat(planJson.usage_c_per_kwh_shoulder || planJson.shoulder_rate || '25');
    
    features.push(peak / 100);
    features.push(offpeak / 100);
    features.push(shoulder / 100);
    
    // Rate spread (peak - offpeak)
    features.push((peak - offpeak) / 100);
    
    // Feed-in tariff
    const fit = parseFloat(planJson.fit_c_per_kwh || planJson.feed_in_tariff || '5');
    features.push(fit / 50);
    
    // Demand charges
    const demand = parseFloat(planJson.demand_c_per_kw || '0');
    features.push(demand / 50);
    
    // Plan type indicators
    const planName = (planJson.plan_name || '').toLowerCase();
    features.push(planName.includes('solar') ? 1 : 0);
    features.push(planName.includes('time') || planName.includes('tou') ? 1 : 0);
    features.push(planName.includes('green') || planName.includes('renewable') ? 1 : 0);
    
    // Retailer encoding
    const retailer = (planJson.retailer || '').toLowerCase();
    const majorRetailers = ['origin', 'agl', 'energyaustralia', 'red energy', 'alinta'];
    features.push(majorRetailers.some(r => retailer.includes(r)) ? 1 : 0.5);
    
    // Network/State
    const network = (planJson.network || '').toLowerCase();
    const networkMap: Record<string, number> = {
      'ausgrid': 0.1, 'endeavour': 0.2, 'essential': 0.3, 'ergon': 0.4,
      'energex': 0.5, 'sapn': 0.6, 'western power': 0.7, 'tasnetworks': 0.8
    };
    features.push(Object.entries(networkMap).find(([n]) => network.includes(n))?.[1] || 0);
    
    // Pad to fixed dimension
    while (features.length < 64) {
      features.push(0);
    }
    
    return {
      dimensions: features.length,
      values: features.slice(0, 64),
      format: 'f32'
    };
  });
}

export function mlEmbedGeneric(obj: Record<string, any>): Promise<VectorEmbedding> {
  const cacheKey = JSON.stringify(obj);
  return memoizeEmbedding(cacheKey, () => {
    const features: number[] = [];
    
    // Extract numerical values
    function extractNumbers(value: any, maxDepth: number = 2): number[] {
      if (maxDepth <= 0) return [];
      
      if (typeof value === 'number') {
        return [isNaN(value) ? 0 : Math.min(Math.max(value / 1000, -10), 10)];
      }
      
      if (typeof value === 'string') {
        const nums = value.match(/\d+(?:\.\d+)?/g);
        return nums ? nums.slice(0, 3).map(n => parseFloat(n) / 1000) : [value.length / 100];
      }
      
      if (typeof value === 'boolean') {
        return [value ? 1 : 0];
      }
      
      if (Array.isArray(value)) {
        return value.slice(0, 5).flatMap(v => extractNumbers(v, maxDepth - 1));
      }
      
      if (typeof value === 'object' && value !== null) {
        return Object.values(value).slice(0, 5).flatMap(v => extractNumbers(v, maxDepth - 1));
      }
      
      return [0];
    }
    
    features.push(...extractNumbers(obj));
    
    // Pad or truncate to fixed dimension
    while (features.length < 64) {
      features.push(0);
    }
    
    return {
      dimensions: 64,
      values: features.slice(0, 64),
      format: 'f32'
    };
  });
}

export async function memoizeEmbedding<T>(
  key: string, 
  fn: () => T
): Promise<T> {
  if (embeddingCache.has(key)) {
    return embeddingCache.get(key) as T;
  }
  
  const result = await Promise.resolve(fn());
  embeddingCache.set(key, result as VectorEmbedding);
  
  // Limit cache size
  if (embeddingCache.size > 1000) {
    const firstKey = embeddingCache.keys().next().value;
    embeddingCache.delete(firstKey);
  }
  
  return result;
}