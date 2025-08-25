import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CECPanel {
  id: string;
  brand: string;
  model: string;
  model_number: string;
  watts: number;
  efficiency?: number;
  technology?: string;
  cec_listing_id?: string;
  is_active: boolean;
}

export interface CECBattery {
  id: string;
  brand: string;
  model: string;
  model_number: string;
  capacity_kwh: number;
  usable_capacity_kwh?: number;
  chemistry?: string;
  warranty_years?: number;
  cec_listing_id?: string;
  is_active: boolean;
}

export interface CECInverter {
  id: string;
  brand: string;
  model: string;
  model_number: string;
  ac_output_kw: number;
  efficiency?: number;
  type?: string;
  cec_listing_id?: string;
  is_active: boolean;
}

export interface VPPProvider {
  id: string;
  name: string;
  company: string;
  signup_bonus: number;
  estimated_annual_reward: number;
  min_battery_kwh: number;
  max_battery_kwh?: number;
  compatible_battery_brands: string[];
  compatible_inverter_brands: string[];
  states_available: string[];
  website?: string;
  contact_phone?: string;
  requirements?: string;
  is_active: boolean;
}

export interface BatteryVPPCompatibility {
  battery_id: string;
  vpp_provider_id: string;
  compatibility_score: number;
  notes?: string;
}

export const useCECData = () => {
  const [panels, setPanels] = useState<CECPanel[]>([]);
  const [batteries, setBatteries] = useState<CECBattery[]>([]);
  const [inverters, setInverters] = useState<CECInverter[]>([]);
  const [vppProviders, setVPPProviders] = useState<VPPProvider[]>([]);
  const [compatibility, setCompatibility] = useState<BatteryVPPCompatibility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('Fetching CEC data...');
      
      // Fetch all data in parallel
      const [panelsResponse, batteriesResponse, invertersResponse, vppResponse, compatibilityResponse, logResponse] = await Promise.all([
        supabase.from('cec_panels').select('*').eq('is_active', true).order('brand, model'),
        supabase.from('cec_batteries').select('*').eq('is_active', true).order('brand, model'),
        supabase.from('cec_inverters').select('*').eq('is_active', true).order('brand, model'),
        supabase.from('vpp_providers').select('*').eq('is_active', true).order('name'),
        supabase.from('battery_vpp_compatibility').select('*'),
        supabase.from('refresh_log').select('fetched_at').eq('status', 'ok').order('fetched_at', { ascending: false }).limit(1)
      ]);

      console.log('Fetched data:', {
        panels: panelsResponse.data?.length || 0,
        batteries: batteriesResponse.data?.length || 0,
        inverters: invertersResponse.data?.length || 0,
        vppProviders: vppResponse.data?.length || 0,
        panelsError: panelsResponse.error,
        batteriesError: batteriesResponse.error,
        invertersError: invertersResponse.error,
        vppError: vppResponse.error
      });

      if (panelsResponse.error) throw panelsResponse.error;
      if (batteriesResponse.error) throw batteriesResponse.error;
      if (invertersResponse.error) throw invertersResponse.error;
      if (vppResponse.error) throw vppResponse.error;
      if (compatibilityResponse.error) throw compatibilityResponse.error;

      setPanels(panelsResponse.data || []);
      setBatteries(batteriesResponse.data || []);
      setInverters(invertersResponse.data || []);
      setVPPProviders(vppResponse.data || []);
      setCompatibility(compatibilityResponse.data || []);
      
      if (logResponse.data && logResponse.data.length > 0) {
        setLastUpdated(logResponse.data[0].fetched_at);
      }

      setError(null);
    } catch (err) {
      console.error('Error fetching CEC data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch CEC data');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    try {
      const response = await supabase.functions.invoke('update-cec-data', {
        body: { refresh_type: 'all' }
      });
      
      if (response.error) throw response.error;
      
      // Wait a moment then refresh local data
      setTimeout(fetchData, 2000);
      
      return response.data;
    } catch (err) {
      console.error('Error refreshing CEC data:', err);
      throw err;
    }
  };

  const getCompatibleVPPs = (batteryId: string): VPPProvider[] => {
    const battery = batteries.find(b => b.id === batteryId);
    if (!battery) return [];

    return vppProviders.filter(vpp => {
      // Check battery capacity range
      if (vpp.min_battery_kwh > battery.capacity_kwh) return false;
      if (vpp.max_battery_kwh && vpp.max_battery_kwh < battery.capacity_kwh) return false;
      
      // Check brand compatibility
      if (vpp.compatible_battery_brands.length > 0 && 
          !vpp.compatible_battery_brands.includes(battery.brand)) return false;
      
      return true;
    }).sort((a, b) => {
      // Sort by total value (signup + annual)
      const aTotal = a.signup_bonus + a.estimated_annual_reward;
      const bTotal = b.signup_bonus + b.estimated_annual_reward;
      return bTotal - aTotal;
    });
  };

  const getBestVPPForBattery = (batteryId: string): VPPProvider | null => {
    const compatibleVPPs = getCompatibleVPPs(batteryId);
    return compatibleVPPs.length > 0 ? compatibleVPPs[0] : null;
  };

  useEffect(() => {
    fetchData();
  }, []);

  return {
    panels,
    batteries,
    inverters,
    vppProviders,
    compatibility,
    loading,
    error,
    lastUpdated,
    refreshData,
    getCompatibleVPPs,
    getBestVPPForBattery,
    refetch: fetchData
  };
};