import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const InitialDataLoader = () => {
  const { toast } = useToast();

  // Force initial data load and refresh
  useEffect(() => {
    const initializeData = async () => {
      try {
        // Always trigger battery scraper to ensure latest data including Sigenergy
        console.log('Refreshing CEC battery data with latest brands...');
        
        const { data, error } = await supabase.functions.invoke('cec-battery-scraper', {
          body: JSON.stringify({})
        });

        if (error) {
          console.error('Error refreshing data:', error);
          toast({
            title: "Data refresh failed",
            description: "Using existing data. Some brands may be missing.",
            variant: "destructive"
          });
          return;
        }

        console.log('CEC data refreshed successfully:', data);
        toast({
          title: "Database updated!",
          description: "Latest CEC-approved products including all brands loaded."
        });

      } catch (error) {
        console.error('Failed to refresh data:', error);
      }
    };

    initializeData();
  }, [toast]);

  return null; // This component doesn't render anything
};