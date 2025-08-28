import { supabase } from "@/integrations/supabase/client";

export interface DnspDetails {
  state: string;
  network: string;
  postcode: number;
  export_cap_kw: number;
  supports_flexible_export?: boolean;
  phase_limit?: string;
  dnsp_code?: string;
  overlap_pct?: number;
}

// Cache for DNSP lookups to avoid repeated database calls
const dnspCache = new Map<string, DnspDetails>();

/**
 * Resolve DNSP (Distribution Network Service Provider) details by postcode
 * Returns the single DNSP for the postcode (each postcode has exactly one DNSP)
 */
export async function getDnspByPostcode(postcode: string | number): Promise<DnspDetails> {
  const postcodeNum = typeof postcode === 'string' ? parseInt(postcode) : postcode;
  
  if (isNaN(postcodeNum) || postcodeNum < 200 || postcodeNum > 9999) {
    throw new Error('Invalid Australian postcode');
  }

  const cacheKey = postcodeNum.toString();
  
  // Check cache first
  if (dnspCache.has(cacheKey)) {
    return dnspCache.get(cacheKey)!;
  }

  try {
    console.log(`Looking up DNSP for postcode ${postcodeNum}`);
    
    // Try the new spatial resolver first, but fall back to old system
    try {
      const { data, error } = await supabase.functions.invoke('dnsps-resolve', {
        body: { postcode: postcodeNum, version: 'v1' }
      });

      if (data?.ok && data.results?.length > 0) {
        const result = data.results[0];
        const dnspDetails: DnspDetails = {
          state: result.state,
          network: result.dnsp_name,
          postcode: result.postcode,
          export_cap_kw: result.export_cap_kw || 5,
          supports_flexible_export: result.supports_flexible_export || false,
          phase_limit: result.phase_limit || '1P<=5kW;3P<=10kW',
          dnsp_code: result.dnsp_code,
          overlap_pct: result.overlap_pct
        };
        
        // Cache the result
        dnspCache.set(cacheKey, dnspDetails);
        return dnspDetails;
      }
    } catch (spatialError) {
      console.warn('Spatial resolver failed, falling back to range-based lookup:', spatialError);
    }

  // Fallback to the old range-based system with enhanced suburb/state matching
  console.log('Using enhanced fallback DNSP lookup with suburb/state matching');
  
  try {
    // First try postcode-based range lookup
    const { data: rangeData, error: rangeError } = await supabase
      .from('dnsps')
      .select('state, network, postcode_start, postcode_end, export_cap_kw')
      .lte('postcode_start', postcodeNum)
      .gte('postcode_end', postcodeNum)
      .order('state')
      .limit(1);

    if (!rangeError && rangeData && rangeData.length > 0) {
      const result = rangeData[0];
      const dnspDetails: DnspDetails = {
        state: result.state,
        network: result.network,
        postcode: postcodeNum,
        export_cap_kw: result.export_cap_kw || 5,
        supports_flexible_export: false,
        phase_limit: '1P<=5kW;3P<=10kW'
      };
      
      dnspCache.set(cacheKey, dnspDetails);
      return dnspDetails;
    }
  } catch (dbError) {
    console.warn('Database range lookup also failed:', dbError);
  }

  // Final fallback: use state-based DNSP mapping
  console.log('Using state-based fallback DNSP mapping');
  const state = getStateFromPostcode(postcodeNum);
  
  // Default DNSP by state mapping (most common distributor per state)
  const stateDnspMap: Record<string, { network: string; export_cap_kw: number }> = {
    'NSW': { network: 'Ausgrid', export_cap_kw: 5 },
    'VIC': { network: 'Citipower', export_cap_kw: 5 },
    'QLD': { network: 'Energex', export_cap_kw: 5 },
    'SA': { network: 'SA Power Networks', export_cap_kw: 5 },
    'WA': { network: 'Western Power', export_cap_kw: 5 },
    'TAS': { network: 'TasNetworks', export_cap_kw: 5 },
    'ACT': { network: 'Evoenergy', export_cap_kw: 5 },
    'NT': { network: 'Power and Water Corporation', export_cap_kw: 5 }
  };

  const defaultDnsp = stateDnspMap[state] || stateDnspMap['NSW'];
  
  const dnspDetails: DnspDetails = {
    state,
    network: defaultDnsp.network,
    postcode: postcodeNum,
    export_cap_kw: defaultDnsp.export_cap_kw,
    supports_flexible_export: false,
    phase_limit: '1P<=5kW;3P<=10kW'
  };
  
  dnspCache.set(cacheKey, dnspDetails);
  console.log(`Fallback DNSP mapping for ${state}: ${defaultDnsp.network}`);
  
  return dnspDetails;
  } catch (error) {
    console.error('DNSP lookup error:', error);
    throw error;
  }
}

/**
 * Get the most common meter type for a given state/DNSP
 */
export function getDefaultMeterType(state: string): "Single" | "TOU" | "Demand" {
  // Most Australian states are moving to Time of Use (TOU) meters
  switch (state) {
    case 'NSW':
    case 'VIC': 
    case 'QLD':
    case 'SA':
      return 'TOU';
    case 'WA':
    case 'TAS':
    case 'ACT':
    case 'NT':
      return 'Single'; // Some states still predominantly use single rate
    default:
      return 'TOU';
  }
}

/**
 * Clear the DNSP cache (useful after importing new data)
 */
export function clearDnspCache() {
  console.log('Clearing DNSP cache');
  dnspCache.clear();
}

// Clear cache on module load to ensure fresh data
clearDnspCache();

/**
 * Get state from postcode (fallback if DNSP lookup fails)
 */
export function getStateFromPostcode(postcode: string | number): string {
  const postcodeNum = typeof postcode === 'string' ? parseInt(postcode) : postcode;
  
  if (postcodeNum >= 1000 && postcodeNum <= 2599) return 'NSW';
  if (postcodeNum >= 2600 && postcodeNum <= 2618) return 'ACT'; 
  if (postcodeNum >= 2619 && postcodeNum <= 2899) return 'NSW';
  if (postcodeNum >= 2900 && postcodeNum <= 2920) return 'ACT';
  if (postcodeNum >= 3000 && postcodeNum <= 3999) return 'VIC';
  if (postcodeNum >= 4000 && postcodeNum <= 4999) return 'QLD';
  if (postcodeNum >= 5000 && postcodeNum <= 5999) return 'SA';
  if (postcodeNum >= 6000 && postcodeNum <= 6799) return 'WA';
  if (postcodeNum >= 7000 && postcodeNum <= 7999) return 'TAS';
  if (postcodeNum >= 800 && postcodeNum <= 899) return 'NT';
  
  return 'NSW'; // Default fallback
}