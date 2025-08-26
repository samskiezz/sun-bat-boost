import { supabase } from "@/integrations/supabase/client";

export async function forceSpecsEnhancement() {
  console.log('🚀 Force triggering specs enhancement...');
  
  try {
    // Call specs-enhancer with aggressive settings
    const { data, error } = await supabase.functions.invoke('specs-enhancer', {
      body: { 
        action: 'enhance_specs', 
        batchSize: 100, // Large batch for faster processing
        offset: 0 
      }
    });

    if (error) {
      console.error('❌ Specs enhancement error:', error);
      throw error;
    }

    console.log('✅ Specs enhancement triggered:', data);
    return data;
    
  } catch (error) {
    console.error('❌ Failed to trigger specs enhancement:', error);
    throw error;
  }
}

// Auto-trigger on import for immediate execution
console.log('⚡ Auto-triggering specs enhancement...');
forceSpecsEnhancement().catch(console.error);