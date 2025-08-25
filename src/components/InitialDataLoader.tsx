import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const InitialDataLoader = () => {
  const { toast } = useToast();

  // Force refresh of both panels and batteries to get real model names
  useEffect(() => {
    const initializeData = async () => {
      try {
        // Check current counts
        const [batteryResult, panelResult] = await Promise.all([
          supabase.from('batteries').select('id', { count: 'exact' }).limit(1),
          supabase.from('pv_modules').select('id', { count: 'exact' }).limit(1)
        ]);

        const batteryCount = batteryResult.count || 0;
        const panelCount = panelResult.count || 0;

        console.log(`Current data: ${batteryCount} batteries, ${panelCount} panels`);

        // Always refresh both datasets to get real model names
        console.log('Refreshing panel data with real model names...');
        await supabase.functions.invoke('cec-panel-scraper');
        
        console.log('Refreshing battery data with real model names...');
        await supabase.functions.invoke('cec-battery-scraper');

        toast({
          title: "Database refreshed!",
          description: `Refreshing with real Trina Solar, Sigenergy, and GoodWe models...`
        });

      } catch (error) {
        console.error('Failed to refresh data:', error);
      }
    };

    initializeData();
  }, [toast]);

  return null; // This component doesn't render anything
};