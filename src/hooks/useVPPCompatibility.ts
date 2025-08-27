import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface VPPProvider {
  id: string;
  name: string;
  company: string;
  states_available: string[];
  compatible_battery_brands: string[];
  compatible_inverter_brands: string[];
  min_battery_kwh: number;
  max_battery_kwh: number;
  estimated_annual_reward: number;
  signup_bonus: number;
  is_active: boolean;
  requirements: string;
  website?: string;
  compatibility_score?: number;
  compatibility_reasons?: string[];
}

interface VPPCompatibilityRequest {
  battery_brand?: string;
  inverter_brand?: string;
  battery_capacity_kwh?: number;
  state?: string;
  postcode?: number;
}

interface VPPCompatibilityResponse {
  success: boolean;
  compatible_providers: VPPProvider[];
  total_providers_found: number;
  compatible_count: number;
  search_criteria: VPPCompatibilityRequest;
  best_match: VPPProvider | null;
  top_rewards: Array<{
    name: string;
    company: string;
    annual_reward: number;
    signup_bonus: number;
    compatibility_score: number;
  }>;
}

export const useVPPCompatibility = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<VPPCompatibilityResponse | null>(null);

  const checkCompatibility = useCallback(async (params: VPPCompatibilityRequest) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: response, error: fnError } = await supabase.functions.invoke(
        'vpp-compatibility-checker',
        { body: params }
      );

      if (fnError) throw fnError;
      if (!response.success) throw new Error(response.error || 'VPP compatibility check failed');

      setData(response);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('VPP compatibility check failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getAllProviders = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: providers, error } = await supabase
        .from('vpp_providers')
        .select('*')
        .eq('is_active', true)
        .order('estimated_annual_reward', { ascending: false });

      if (error) throw error;

      return providers;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch VPP providers';
      setError(errorMessage);
      console.error('Failed to fetch VPP providers:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getCompatibleVPPs = useCallback((batteryBrand?: string) => {
    if (!data?.compatible_providers) return [];
    
    if (!batteryBrand) return data.compatible_providers;
    
    return data.compatible_providers.filter(provider =>
      provider.compatible_battery_brands?.some(brand =>
        brand.toLowerCase().includes(batteryBrand.toLowerCase()) ||
        batteryBrand.toLowerCase().includes(brand.toLowerCase())
      )
    );
  }, [data]);

  return {
    loading,
    error,
    data,
    checkCompatibility,
    getAllProviders,
    getCompatibleVPPs,
    // Quick access helpers
    bestMatch: data?.best_match,
    topRewards: data?.top_rewards || [],
    compatibleCount: data?.compatible_count || 0
  };
};

export default useVPPCompatibility;