import { supabase } from "@/integrations/supabase/client";

export interface DnspDetails {
  state: string;
  network: string;
  postcode_start: number;
  postcode_end: number;
  export_cap_kw: number;
}

// Cache for DNSP lookups to avoid repeated database calls
const dnspCache = new Map<string, DnspDetails[]>();

/**
 * Resolve DNSP (Distribution Network Service Provider) details by postcode
 * Returns array as some postcodes may span multiple DNSPs
 */
export async function getDnspByPostcode(postcode: string | number): Promise<DnspDetails[]> {
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
    const { data, error } = await supabase
      .from('dnsps')
      .select('state, network, postcode_start, postcode_end, export_cap_kw')
      .lte('postcode_start', postcodeNum)
      .gte('postcode_end', postcodeNum)
      .order('state');

    if (error) {
      console.error('Error fetching DNSP data:', error);
      throw new Error('Failed to fetch DNSP data');
    }

    const results = data || [];
    
    // Cache the results
    dnspCache.set(cacheKey, results);
    
    return results;
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
  dnspCache.clear();
}

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