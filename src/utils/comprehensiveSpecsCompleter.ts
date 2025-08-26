import { supabase } from '@/integrations/supabase/client';
import { runComprehensiveFallbackScraping, triggerSpecsEnhancement } from './comprehensiveFallbackScraper';

export async function runComprehensiveSpecsCompletion() {
  console.log('🚀 Starting comprehensive specs completion process...');
  
  try {
    // Step 1: Run comprehensive fallback scraping to find missing datasheets
    console.log('📊 Step 1: Running Google fallback scraping...');
    const fallbackResult = await runComprehensiveFallbackScraping();
    
    if (!fallbackResult.success) {
      console.error('❌ Fallback scraping failed:', fallbackResult.error);
    } else {
      console.log('✅ Fallback scraping completed:', fallbackResult);
    }

    // Step 2: Trigger enhanced web scraper for additional coverage
    console.log('🌐 Step 2: Running enhanced web scraper...');
    const { data: webResult, error: webError } = await supabase.functions.invoke('enhanced-web-scraper', {
      body: { 
        action: 'comprehensive_scrape',
        categories: ['PANEL', 'BATTERY_MODULE'],
        batchSize: 50
      }
    });

    if (webError) {
      console.error('❌ Enhanced web scraper error:', webError);
    } else {
      console.log('✅ Enhanced web scraper completed:', webResult);
    }

    // Step 3: Force comprehensive specs enhancement with AI + Web fallback
    console.log('🤖 Step 3: Running comprehensive specs enhancement...');
    const { data: specsResult, error: specsError } = await supabase.functions.invoke('specs-enhancer', {
      body: { 
        action: 'full_enhancement',
        batchSize: 100,
        offset: 0,
        forceProcessing: true,
        categories: ['PANEL', 'BATTERY_MODULE']
      }
    });

    if (specsError) {
      console.error('❌ Specs enhancement error:', specsError);
    } else {
      console.log('✅ Specs enhancement completed:', specsResult);
    }

    // Step 4: Trigger additional batch processing for remaining products
    console.log('🔄 Step 4: Processing remaining batches...');
    let offset = 100;
    let hasMore = true;
    
    while (hasMore && offset < 2000) { // Safety limit
      const { data: batchResult, error: batchError } = await supabase.functions.invoke('specs-enhancer', {
        body: { 
          action: 'enhance_specs',
          batchSize: 100,
          offset: offset,
          forceProcessing: true,
          categories: ['PANEL', 'BATTERY_MODULE']
        }
      });

      if (batchError || !batchResult?.hasMore) {
        hasMore = false;
      } else {
        console.log(`✅ Batch ${offset}-${offset + 100} completed`);
        offset += 100;
      }

      // Small delay to prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Step 5: Force web-only processing as final fallback
    console.log('🌐 Step 5: Final web-only processing...');
    const { data: finalWebResult, error: finalWebError } = await supabase.functions.invoke('enhanced-web-scraper', {
      body: { 
        action: 'web_only_batch',
        categories: ['PANEL', 'BATTERY_MODULE'],
        batchSize: 200,
        offset: 0
      }
    });

    if (finalWebError) {
      console.error('❌ Final web processing error:', finalWebError);
    } else {
      console.log('✅ Final web processing completed:', finalWebResult);
    }

    // Step 6: Get final status
    const { data: finalStatus } = await supabase
      .from('products')
      .select('category, id')
      .in('category', ['PANEL', 'BATTERY_MODULE']);

    const panelCount = finalStatus?.filter(p => p.category === 'PANEL').length || 0;
    const batteryCount = finalStatus?.filter(p => p.category === 'BATTERY_MODULE').length || 0;

    // Check comprehensive specs completion
    const { data: specsStatus } = await supabase
      .from('specs')
      .select('product_id, products(category)')
      .not('product_id', 'is', null);

    const panelSpecsCount = specsStatus?.filter(s => 
      s.products && (s.products as any).category === 'PANEL'
    ).length || 0;
    
    const batterySpecsCount = specsStatus?.filter(s => 
      s.products && (s.products as any).category === 'BATTERY_MODULE'
    ).length || 0;

    const result = {
      success: true,
      panels: {
        total: panelCount,
        with_specs: panelSpecsCount,
        completion_rate: panelCount > 0 ? (panelSpecsCount / panelCount * 100).toFixed(1) + '%' : '0%'
      },
      batteries: {
        total: batteryCount,
        with_specs: batterySpecsCount,
        completion_rate: batteryCount > 0 ? (batterySpecsCount / batteryCount * 100).toFixed(1) + '%' : '0%'
      },
      message: 'Comprehensive specs completion process finished'
    };

    console.log('🎉 Comprehensive specs completion completed:', result);
    return result;

  } catch (error) {
    console.error('❌ Comprehensive specs completion failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Auto-trigger the comprehensive specs completion
console.log('⚡ Auto-triggering comprehensive specs completion...');
runComprehensiveSpecsCompletion().catch(console.error);