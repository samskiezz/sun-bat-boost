import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const InitialDataLoader = () => {
  const { toast } = useToast();

  useEffect(() => {
    const initializeData = async () => {
      try {
        // Check if data already exists
        const { data: panelsCheck } = await supabase
          .from('cec_panels')
          .select('id')
          .limit(1);

        if (panelsCheck && panelsCheck.length > 0) {
          console.log('CEC data already exists');
          return;
        }

        console.log('Initializing CEC data...');
        
        // Call the edge function to populate initial data
        const { data, error } = await supabase.functions.invoke('update-cec-data', {
          body: { refresh_type: 'all' }
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