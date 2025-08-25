import { useState, useEffect, useCallback } from 'react';
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
  const [dataComplete, setDataComplete] = useState(false);

  // Fetch all data without any limits - for initial load
  const fetchAllDataComplete = useCallback(async (skipLoadingState = false) => {
    try {
      if (!skipLoadingState) {
        setLoading(true);
      }
      setError(null);

      console.log('Fetching ALL CEC data (complete dataset)...');

      // Fetch data without any limits - get ALL records
      const [pvResult, batteryResult, vppResult, changesResult] = await Promise.all([
        (supabase as any).from('pv_modules').select('*').order('brand', { ascending: true }),
        (supabase as any).from('batteries').select('*').order('brand', { ascending: true }),
        (supabase as any).from('vpp_providers').select('*').eq('is_active', true).order('name', { ascending: true }),
        (supabase as any).from('product_changes').select('*').order('changed_at', { ascending: false }).limit(100)
      ]);

      console.log('Complete data fetch results:', {
        panels: pvResult.data?.length || 0,
        batteries: batteryResult.data?.length || 0,
        vppProviders: vppResult.data?.length || 0,
        changes: changesResult.data?.length || 0,
        panelsError: pvResult.error,
        batteriesError: batteryResult.error,
        vppError: vppResult.error,
        changesError: changesResult.error
      });

      // Handle errors but don't throw - continue with what we have
      if (pvResult.error) {
        console.error('PV modules error:', pvResult.error);
      } else {
        setPanels(pvResult.data || []);
      }

      if (batteryResult.error) {
        console.error('Batteries error:', batteryResult.error);
      } else {
        setBatteries(batteryResult.data || []);
      }

      if (vppResult.error) {
        console.error('VPP providers error:', vppResult.error);
      } else {
        setVppProviders(vppResult.data || []);
      }

      if (changesResult.error) {
        console.error('Product changes error:', changesResult.error);
      } else {
        setProductChanges(changesResult.data || []);
      }

      // Debug: Check for Trina Solar specifically
      const panelData = pvResult.data || [];
      if (panelData.length > 0) {
        const trinaPanels = panelData.filter((p: any) => 
          p.brand && p.brand.toLowerCase().includes('trina')
        );
        console.log(`✅ Found ${trinaPanels.length} Trina Solar panels:`, trinaPanels.slice(0, 3));
        
        const allBrands = [...new Set(panelData.map((p: any) => p.brand))].sort();
        console.log(`✅ All ${allBrands.length} panel brands:`, allBrands.slice(0, 15));
      }

      // Set last updated timestamp
      const batteryData = batteryResult.data || [];
      const allScrapedDates = [
        ...panelData.map((p: any) => p.scraped_at),
        ...batteryData.map((b: any) => b.scraped_at)
      ].filter(Boolean);

      if (allScrapedDates.length > 0) {
        const latestDate = new Date(Math.max(...allScrapedDates.map((d: string) => new Date(d).getTime())));
        setLastUpdated(latestDate);
      }

      // Check if data is complete
      const isComplete = panelData.length >= 1300 && batteryData.length >= 800;
      setDataComplete(isComplete);

      if (isComplete) {
        console.log('✅ Database is complete! Panels:', panelData.length, 'Batteries:', batteryData.length);
      } else {
        console.log('⚠️ Database may need updating. Panels:', panelData.length, 'Batteries:', batteryData.length);
        console.log('💡 Use the refresh button to get the latest data if needed.');
      }

    } catch (err) {
      console.error('❌ Error fetching complete CEC data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      if (!skipLoadingState) {
        setLoading(false);
      }
    }
  }, []);

  // Force complete scrape using new edge function
  const forceCompleteScrape = useCallback(async () => {
    try {
      console.log('🚀 Triggering force complete scrape...');
      
      const { data, error } = await supabase.functions.invoke('force-complete-scrape', {});

      if (error) {
        console.error('❌ Force scrape error:', error);
        throw error;
      }

      console.log('✅ Force scrape result:', data);
      return data;
    } catch (err) {
      console.error('❌ Error in force scrape:', err);
      throw err;
    }
  }, []);

  // Main refresh function - only used when user manually clicks refresh
  const refreshData = useCallback(async () => {
    try {
      setAutoRefreshing(true);
      
      // Force update by calling scrapers directly (will check if update needed)
      await forceCompleteScrape();
      
      // Wait then fetch all data
      setTimeout(async () => {
        await fetchAllDataComplete(true);
        setAutoRefreshing(false);
      }, 3000);
      
    } catch (err) {
      console.error('❌ Error refreshing data:', err);
      setAutoRefreshing(false);
      throw err;
    }
  }, [forceCompleteScrape, fetchAllDataComplete]);

  // Auto-refresh disabled - user can manually refresh if needed

  // Helper functions for VPP compatibility
  const getCompatibleVPPs = useCallback((batteryBrand: string): VPPProvider[] => {
    return vppProviders.filter(vpp => {
      if (vpp.compatible_battery_brands && vpp.compatible_battery_brands.length > 0) {
        return vpp.compatible_battery_brands.some(brand => 
          brand.toLowerCase() === batteryBrand.toLowerCase()
        );
      }
      return true;
    });
  }, [vppProviders]);

  const getBestVPPForBattery = useCallback((batteryBrand: string): VPPProvider | null => {
    const compatibleVPPs = getCompatibleVPPs(batteryBrand);
    if (compatibleVPPs.length === 0) return null;

    return compatibleVPPs.reduce((best, current) => {
      const currentValue = (current.signup_bonus || 0) + (current.estimated_annual_reward || 0);
      const bestValue = (best.signup_bonus || 0) + (best.estimated_annual_reward || 0);
      return currentValue > bestValue ? current : best;
    });
  }, [getCompatibleVPPs]);

  // Initial load
  useEffect(() => {
    fetchAllDataComplete();
  }, [fetchAllDataComplete]);

  return {
    panels,
    batteries,
    inverters: [],
    vppProviders,
    compatibility: [],
    productChanges,
    loading,
    error,
    lastUpdated,
    autoRefreshing,
    autoRefreshAttempts,
    dataComplete,
    refreshData,
    getCompatibleVPPs,
    getBestVPPForBattery,
    refetch: fetchAllDataComplete
  };
};