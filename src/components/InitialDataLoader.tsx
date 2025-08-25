import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const InitialDataLoader = () => {
  const { toast } = useToast();

  useEffect(() => {
    const initializeData = async () => {
      try {
        // Check if we have enough batteries (should be 750+)
        const { data: batteryCheck, count } = await supabase
          .from('batteries')
          .select('id', { count: 'exact' })
          .limit(1);

        if (count && count >= 500) {
          console.log(`CEC data already exists (${count} batteries)`);
          return;
        }

        console.log(`Initializing CEC battery data... (current: ${count || 0} batteries, target: 750+)`);
        
        // Call the CEC battery scraper to get the 750+ batteries
        console.log('Calling CEC battery scraper...');
        const { data, error } = await supabase.functions.invoke('cec-battery-scraper', {
          body: JSON.stringify({})
        });

        if (error) {
          console.error('Error initializing data:', error);
          toast({
            title: "Data initialization failed",
            description: "Using fallback data. Some features may be limited.",
            variant: "destructive"
          });
          return;
        }

        console.log('CEC data initialized successfully:', data);
        toast({
          title: "Database updated!",
          description: "Latest CEC-approved products and VPP providers loaded."
        });

      } catch (error) {
        console.error('Failed to initialize data:', error);
      }
    };

    initializeData();
  }, [toast]);

  return null; // This component doesn't render anything
};