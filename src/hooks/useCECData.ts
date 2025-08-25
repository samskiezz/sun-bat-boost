import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CECPanel {
  id: string;
  brand: string;
  model: string;
  technology?: string;
  certificate?: string;
  approval_status?: string;
  approval_expires?: string;
  datasheet_url?: string;
  source_url: string;
  hash?: string;
  scraped_at: string;
  power_rating?: number;
  image_url?: string;
  description?: string;
}

export interface CECBattery {
  id: string;
  brand: string;
  model: string;
  chemistry?: string;
  certificate?: string;
  approval_status?: string;
  approval_expires?: string;
  datasheet_url?: string;
  source_url: string;
  hash?: string;
  scraped_at: string;
  capacity_kwh?: number;
  vpp_capable?: boolean;
  image_url?: string;
  description?: string;
  nominal_capacity?: number;
  usable_capacity?: number;
  units?: number;
}

export interface VPPProvider {
  id: string;
  name: string;
  company: string;
  signup_bonus: number;
  estimated_annual_reward: number;
  min_battery_kwh?: number;
  max_battery_kwh?: number;
  compatible_battery_brands?: string[];
  compatible_inverter_brands?: string[];
  states_available?: string[];
  requirements?: string;
  website?: string;
  contact_phone?: string;
  terms_url?: string;
  is_active: boolean;
}

export interface ProductChange {
  id: string;
  product_type: 'pv' | 'battery';
  brand: string;
  model: string;
  old_hash?: string;
  new_hash?: string;
  changed_at: string;
}

export const useCECData = () => {
  const [panels, setPanels] = useState<CECPanel[]>([]);
  const [batteries, setBatteries] = useState<CECBattery[]>([]);
  const [vppProviders, setVppProviders] = useState<VPPProvider[]>([]);
  const [productChanges, setProductChanges] = useState<ProductChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefreshing, setAutoRefreshing] = useState(false);
  const [autoRefreshAttempts, setAutoRefreshAttempts] = useState(0);

  const fetchData = async (skipLoadingState = false) => {
    try {
      if (!skipLoadingState) {
        setLoading(true);
      }
      setError(null);

      console.log('Fetching CEC data...');

      // Fetch all data in parallel - using any to bypass TypeScript issues until types are regenerated
      const [pvResult, batteryResult, vppResult, changesResult] = await Promise.all([
        (supabase as any).from('pv_modules').select('*').order('brand', { ascending: true }),
        (supabase as any).from('batteries').select('*').order('brand', { ascending: true }),
        (supabase as any).from('vpp_providers').select('*').eq('is_active', true).order('name', { ascending: true }),
        (supabase as any).from('product_changes').select('*').order('changed_at', { ascending: false }).limit(100)
      ]);

      console.log('Fetched data:', {
        panels: pvResult.data?.length || 0,
        batteries: batteryResult.data?.length || 0,
        vppProviders: vppResult.data?.length || 0,
        changes: changesResult.data?.length || 0,
        panelsError: pvResult.error,
        batteriesError: batteryResult.error,
        vppError: vppResult.error,
        changesError: changesResult.error
      });

      // Debug: Check for Trina Solar specifically
      if (pvResult.data) {
        const trinaPanels = pvResult.data.filter((p: any) => p.brand.toLowerCase().includes('trina'));
        console.log(`Found ${trinaPanels.length} Trina Solar panels:`, trinaPanels.slice(0, 5));
        
        const allBrands = [...new Set(pvResult.data.map((p: any) => p.brand))].sort();
        console.log('All panel brands loaded:', allBrands.length, allBrands.slice(0, 10));
      }

      if (pvResult.error) {
        console.error('PV modules error:', pvResult.error);
        // Don't throw, just log the error
      } else {
        setPanels(pvResult.data || []);
      }

      if (batteryResult.error) {
        console.error('Batteries error:', batteryResult.error);
        // Don't throw, just log the error  
      } else {
        setBatteries(batteryResult.data || []);
      }

      if (vppResult.error) {
        console.error('VPP providers error:', vppResult.error);
        // Don't throw, just log the error
      } else {
        setVppProviders(vppResult.data || []);
      }

      if (changesResult.error) {
        console.error('Product changes error:', changesResult.error);
        // Don't throw, just log the error
      } else {
        setProductChanges(changesResult.data || []);
      }

      // Set last updated from the most recent scraped_at timestamp
      const allScrapedDates = [
        ...(pvResult.data || []).map((p: any) => p.scraped_at),
        ...(batteryResult.data || []).map((b: any) => b.scraped_at)
      ].filter(Boolean);

      if (allScrapedDates.length > 0) {
        const latestDate = new Date(Math.max(...allScrapedDates.map((d: string) => new Date(d).getTime())));
        setLastUpdated(latestDate);
      }

    } catch (err) {
      console.error('Error fetching CEC data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    try {
      console.log('Triggering CEC scrape...');
      
      // Call the new cec-scrape edge function
      const { data, error } = await supabase.functions.invoke('cec-scrape', {
        body: JSON.stringify({ mode: 'run' })
      });

      if (error) {
        console.error('CEC scrape error:', error);
        throw error;
      }

      console.log('CEC scrape result:', data);
      
      // Wait a moment then refresh the local data
      setTimeout(() => {
        fetchData();
      }, 2000);

      return data;
    } catch (err) {
      console.error('Error refreshing CEC data:', err);
      throw err;
    }
  };

  // Auto-refresh logic to ensure sufficient data
  const checkAndAutoRefresh = async () => {
    const hasInsufficientData = panels.length < 1500 || batteries.length < 800;
    const shouldAutoRefresh = hasInsufficientData && autoRefreshAttempts < 10 && !autoRefreshing && !loading;
    
    if (shouldAutoRefresh) {
      console.log(`Auto-refreshing data: panels=${panels.length}, batteries=${batteries.length}, attempt=${autoRefreshAttempts + 1}`);
      setAutoRefreshing(true);
      setAutoRefreshAttempts(prev => prev + 1);
      
      try {
        // Call the new cec-scrape edge function
        const { data, error } = await supabase.functions.invoke('cec-scrape', {
          body: JSON.stringify({ mode: 'run' })
        });

        if (error) {
          console.error('Auto-refresh CEC scrape error:', error);
        } else {
          console.log('Auto-refresh CEC scrape result:', data);
        }
        
        // Wait then refresh data without loading state to prevent flickering
        setTimeout(async () => {
          await fetchData(true); // Skip loading state to prevent flickering
          setAutoRefreshing(false);
        }, 3000);
      } catch (error) {
        console.error('Auto-refresh failed:', error);
        setAutoRefreshing(false);
      }
    }
  };

  // Check for auto-refresh after data changes
  useEffect(() => {
    if (!loading && panels.length > 0 && batteries.length > 0) {
      checkAndAutoRefresh();
    }
  }, [panels.length, batteries.length, loading, autoRefreshAttempts, autoRefreshing]);

  // Helper functions for VPP compatibility
  const getCompatibleVPPs = (batteryBrand: string): VPPProvider[] => {
    return vppProviders.filter(vpp => {
      // Check battery brand compatibility
      if (vpp.compatible_battery_brands && vpp.compatible_battery_brands.length > 0) {
        return vpp.compatible_battery_brands.some(brand => 
          brand.toLowerCase() === batteryBrand.toLowerCase()
        );
      }
      return true;
    });
  };

  const getBestVPPForBattery = (batteryBrand: string): VPPProvider | null => {
    const compatibleVPPs = getCompatibleVPPs(batteryBrand);
    if (compatibleVPPs.length === 0) return null;

    // Return the VPP with the highest total value (signup bonus + estimated annual reward)
    return compatibleVPPs.reduce((best, current) => {
      const currentValue = (current.signup_bonus || 0) + (current.estimated_annual_reward || 0);
      const bestValue = (best.signup_bonus || 0) + (best.estimated_annual_reward || 0);
      return currentValue > bestValue ? current : best;
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  return {
    panels,
    batteries,
    inverters: [], // Empty array for now since we don't have inverters in the new schema
    vppProviders,
    compatibility: [], // Empty array for now since we don't have compatibility table yet
    productChanges,
    loading,
    error,
    lastUpdated,
    autoRefreshing,
    autoRefreshAttempts,
    refreshData,
    getCompatibleVPPs,
    getBestVPPForBattery,
    refetch: fetchData
  };
};