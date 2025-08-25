import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const InitialDataLoader = () => {
  const { toast } = useToast();

  // Force initial data load and refresh
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

        // Refresh both if needed
        if (batteryCount < 500) {
          console.log('Refreshing battery data...');
          await supabase.functions.invoke('cec-battery-scraper');
        }

        if (panelCount < 500) {
          console.log('Refreshing panel data...');
          await supabase.functions.invoke('cec-panel-scraper');
        }

        toast({
          title: "Database refreshed!",
          description: "Latest CEC-approved products loaded."
        });

      } catch (error) {
        console.error('Failed to refresh data:', error);
      }
    };

    initializeData();
  }, [toast]);

  return null; // This component doesn't render anything
};