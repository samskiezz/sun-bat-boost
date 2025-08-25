import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const InitialDataLoader = () => {
  const { toast } = useToast();

  // Force refresh of battery data to restore full dataset
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

        // Always refresh batteries to restore full dataset (target 1200+)
        if (batteryCount < 1000) {
          console.log('Refreshing battery data to restore full dataset...');
          await supabase.functions.invoke('cec-battery-scraper');
        }

        // Refresh panels if needed
        if (panelCount < 500) {
          console.log('Refreshing panel data...');
          await supabase.functions.invoke('cec-panel-scraper');
        }

        toast({
          title: "Database refreshed!",
          description: `Loading complete: ${panelCount} panels, refreshing batteries to 1200+`
        });

      } catch (error) {
        console.error('Failed to refresh data:', error);
      }
    };

    initializeData();
  }, [toast]);

  return null; // This component doesn't render anything
};