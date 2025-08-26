import { supabase } from '@/integrations/supabase/client';

export async function forceCompleteReset() {
  try {
    console.log('🔄 Triggering complete system reset...');
    
    const { data, error } = await supabase.functions.invoke('cec-comprehensive-scraper', {
      body: { 
        action: 'force_complete_reset'
      }
    });
    
    if (error) {
      console.error('❌ Reset failed:', error);
      throw error;
    }
    
    console.log('✅ Reset completed:', data);
    return data;
    
  } catch (error) {
    console.error('❌ Failed to trigger reset:', error);
    throw error;
  }
}