import { GoogleFallbackScraper } from '@/lib/google-fallback';
import { supabase } from '@/integrations/supabase/client';

// Trigger comprehensive fallback scraping for all missing datasheets
export async function runComprehensiveFallbackScraping() {
  console.log('🚀 Starting comprehensive fallback scraping...');
  
  try {
    // Initialize the Google fallback scraper
    const scraper = new GoogleFallbackScraper();
    
    // Run the fallback scraping
    await scraper.findMissingDatasheets();
    
    // Get current stats
    const { data: stats } = await supabase
      .from('products')
      .select('category, datasheet_url, pdf_path')
      .not('datasheet_url', 'is', null);
    
    const panelCount = stats?.filter(s => s.category === 'PANEL').length || 0;
    const batteryCount = stats?.filter(s => s.category === 'BATTERY_MODULE').length || 0;
    const inverterCount = stats?.filter(s => s.category === 'INVERTER').length || 0;
    
    console.log(`✅ Fallback scraping complete. Found datasheets for:`);
    console.log(`   - ${panelCount} panels`);
    console.log(`   - ${batteryCount} batteries`);
    console.log(`   - ${inverterCount} inverters`);
    
    return {
      success: true,
      panel_count: panelCount,
      battery_count: batteryCount,
      inverter_count: inverterCount,
      total_count: panelCount + batteryCount + inverterCount
    };
    
  } catch (error) {
    console.error('❌ Comprehensive fallback scraping failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Helper function to trigger specs enhancement after scraping
export async function triggerSpecsEnhancement() {
  console.log('🔧 Triggering specs enhancement...');
  
  try {
    const { data, error } = await supabase.functions.invoke('specs-enhancer', {
      body: { action: 'full_enhancement' }
    });
    
    if (error) {
      console.error('❌ Specs enhancement error:', error);
      return { success: false, error: error.message };
    }
    
    console.log('✅ Specs enhancement completed:', data);
    return { success: true, data };
    
  } catch (error) {
    console.error('❌ Specs enhancement failed:', error);
    return { success: false, error: error.message };
  }
}