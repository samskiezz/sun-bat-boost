import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CECPanel {
  id: number;
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
  id: number;
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
  id: number;
  product_type: string;
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

  // Fetch all data with pagination to overcome Supabase limits
  const fetchAllDataComplete = useCallback(async (skipLoadingState = false) => {
    try {
      if (!skipLoadingState) {
        setLoading(true);
      }
      setError(null);

      console.log('🔄 Fetching ALL CEC data with pagination...');

      // Approved brands filter
      const approvedPanelBrands = ['REC', 'AIKO', 'LONGI', 'JINKO', 'TINDO'];
      const approvedBatteryBrands = ['SIGENERGY', 'SUNGROW', 'GOODWE', 'FOX ESS', 'TESLA'];

      // Helper functions to fetch all pages for specific tables
      const fetchAllPanels = async () => {
        let allData: any[] = [];
        let from = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabase
            .from('pv_modules')
            .select('*')
            .or(approvedPanelBrands.map(brand => `brand.ilike.%${brand}%`).join(','))
            .range(from, from + pageSize - 1)
            .order('brand', { ascending: true });

          if (error) {
            console.error(`Error fetching pv_modules page ${from}:`, error);
            break;
          }

          if (data && data.length > 0) {
            allData = [...allData, ...data];
            from += pageSize;
            hasMore = data.length === pageSize;
            console.log(`📄 Fetched ${data.length} approved panels (total: ${allData.length})`);
          } else {
            hasMore = false;
          }
        }

        return allData;
      };

      const fetchAllBatteries = async () => {
        let allData: any[] = [];
        let from = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabase
            .from('batteries')
            .select('*')
            .or(approvedBatteryBrands.map(brand => `brand.ilike.%${brand}%`).join(','))
            .range(from, from + pageSize - 1)
            .order('brand', { ascending: true });

          if (error) {
            console.error(`Error fetching batteries page ${from}:`, error);
            break;
          }

          if (data && data.length > 0) {
            allData = [...allData, ...data];
            from += pageSize;
            hasMore = data.length === pageSize;
            console.log(`📄 Fetched ${data.length} approved batteries (total: ${allData.length})`);
          } else {
            hasMore = false;
          }
        }

        return allData;
      };

      // Fetch all data using pagination
      const [allPanels, allBatteries, allVppProviders, allChanges] = await Promise.all([
        fetchAllPanels().catch(async (error) => {
          console.warn('⚠️ pv_modules failed, falling back to products table:', error);
          const { data } = await supabase
            .from('products')
            .select('*, manufacturers(name)')
            .eq('category', 'PANEL')
            .eq('status', 'active')
            .or(approvedPanelBrands.map(brand => `manufacturers.name.ilike.%${brand}%`).join(','));
          
          // Map products to panel format
          return (data || []).map(product => ({
            id: product.id,
            brand: product.manufacturers?.name || 'Unknown',
            model: product.model,
            power_rating: null,
            technology: null,
            datasheet_url: product.datasheet_url,
            scraped_at: product.created_at,
            approval_status: 'active',
            source_url: product.product_url || ''
          }));
        }),
        fetchAllBatteries().catch(async (error) => {
          console.warn('⚠️ batteries failed, falling back to products table:', error);
          const { data } = await supabase
            .from('products')
            .select('*, manufacturers(name)')
            .eq('category', 'BATTERY_MODULE')
            .eq('status', 'active')
            .or(approvedBatteryBrands.map(brand => `manufacturers.name.ilike.%${brand}%`).join(','));
          
          // Map products to battery format
          return (data || []).map(product => ({
            id: product.id,
            brand: product.manufacturers?.name || 'Unknown',
            model: product.model,
            capacity_kwh: null,
            chemistry: null,
            datasheet_url: product.datasheet_url,
            scraped_at: product.created_at,
            approval_status: 'active',
            vpp_capable: false,
            source_url: product.product_url || ''
          }));
        }),
        supabase.from('vpp_providers').select('*').eq('is_active', true).order('name', { ascending: true }).then(r => r.data || []),
        supabase.from('product_changes').select('*').order('changed_at', { ascending: false }).limit(100).then(r => r.data || [])
      ]);

      console.log('🎯 PAGINATION COMPLETE - Final results:', {
        panels: allPanels.length,
        batteries: allBatteries.length,
        vppProviders: allVppProviders.length,
        changes: allChanges.length
      });

      // Immediate verification - check for approved brands in paginated data
      if (allPanels && allPanels.length > 0) {
        const recPanels = allPanels.filter((p: any) => 
          p.brand && p.brand.toLowerCase().includes('rec')
        );
        console.log(`✅ REC PANELS FOUND: ${recPanels.length}`);
        
        const jinko = allPanels.filter((p: any) => 
          p.brand && p.brand.toLowerCase().includes('jinko')
        );
        console.log(`✅ JINKO FOUND: ${jinko.length} panels`);
        
        const approvedBrands = [...new Set(allPanels.map((p: any) => p.brand))].sort();
        console.log(`✅ APPROVED PANEL BRANDS: ${approvedBrands.length}`, approvedBrands);
      }

      if (allBatteries && allBatteries.length > 0) {
        const tesla = allBatteries.filter((b: any) => 
          b.brand && b.brand.toLowerCase().includes('tesla')
        );
        console.log(`✅ TESLA BATTERIES FOUND: ${tesla.length}`);
        
        const sigenergy = allBatteries.filter((b: any) => 
          b.brand && b.brand.toLowerCase().includes('sigenergy')
        );
        console.log(`✅ SIGENERGY BATTERIES FOUND: ${sigenergy.length}`);
        
        const approvedBatteryBrands = [...new Set(allBatteries.map((b: any) => b.brand))].sort();
        console.log(`✅ APPROVED BATTERY BRANDS: ${approvedBatteryBrands.length}`, approvedBatteryBrands);
      }

      // Set the state with paginated data
      setPanels(allPanels || []);
      setBatteries(allBatteries || []);
      setVppProviders(allVppProviders || []);
      setProductChanges(allChanges || []);

      console.log(`🚀 STATE SET - Approved Panels: ${allPanels.length}, Approved Batteries: ${allBatteries.length}, VPPs: ${allVppProviders.length}`);

      // Set last updated timestamp using paginated data
      const allScrapedDates = [
        ...allPanels.map((p: any) => p.scraped_at),
        ...allBatteries.map((b: any) => b.scraped_at)
      ].filter(Boolean);

      if (allScrapedDates.length > 0) {
        const latestDate = new Date(Math.max(...allScrapedDates.map((d: string) => new Date(d).getTime())));
        setLastUpdated(latestDate);
      }

      // Always consider data complete since we now use weekly updates
      setDataComplete(true);
      console.log('✅ PAGINATION SUCCESS! Approved products loaded - Panels:', allPanels.length, 'Batteries:', allBatteries.length, 'VPPs:', allVppProviders.length);

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