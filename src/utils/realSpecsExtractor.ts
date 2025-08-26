import { supabase } from '@/integrations/supabase/client';

export async function extractRealSpecsForProducts() {
  console.log('🚀 Starting REAL specs extraction for products needing 6+ comprehensive specs...');
  
  try {
    // Get products that need comprehensive specs (currently have < 6 specs)
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, model, category, datasheet_url, pdf_path, raw')
      .in('category', ['PANEL', 'BATTERY_MODULE', 'INVERTER'])
      .eq('status', 'active')
      .not('datasheet_url', 'is', null)
      .not('pdf_path', 'is', null);

    if (productsError) {
      throw productsError;
    }

    console.log(`📊 Found ${products?.length || 0} total products with PDFs`);
    
    // Filter products that need more specs (< 6)
    const productsNeedingSpecs = [];
    for (const product of products || []) {
      const { count } = await supabase
        .from('specs')
        .select('*', { count: 'exact', head: true })
        .eq('product_id', product.id);
      
      if ((count || 0) < 6) {
        productsNeedingSpecs.push({
          ...product,
          current_specs: count || 0
        });
      }
    }
    
    console.log(`🎯 ${productsNeedingSpecs.length} products need comprehensive specs (6+)`);
    
    let processed = 0;
    let successful = 0;
    
    // Process products in batches to extract real specs
    for (let i = 0; i < productsNeedingSpecs.length; i++) {
      const product = productsNeedingSpecs[i];
      
      console.log(`🔧 Processing ${i + 1}/${productsNeedingSpecs.length}: ${product.category} ${product.model} (has ${product.current_specs} specs)`);
      
      try {
        // Call the specs-enhancer function with AI + Web extraction
        const { data: enhanceResult, error: enhanceError } = await supabase.functions.invoke('specs-enhancer', {
          body: { 
            action: 'enhance_specs',
            productId: product.id,
            forceProcessing: true
          }
        });

        if (enhanceError) {
          console.error(`❌ Specs enhancer error for ${product.model}:`, enhanceError);
          
          // Try enhanced web scraper as fallback
          console.log(`🌐 Trying web scraper fallback for ${product.model}...`);
          const { data: webResult, error: webError } = await supabase.functions.invoke('enhanced-web-scraper', {
            body: { 
              action: 'enhance_product',
              productId: product.id
            }
          });

          if (!webError && webResult?.success) {
            console.log(`✅ Web scraper successful for ${product.model}: ${webResult.specsAdded || 0} specs`);
            successful++;
          } else {
            console.error(`❌ Web scraper also failed for ${product.model}:`, webError);
          }
        } else if (enhanceResult?.success) {
          console.log(`✅ AI extraction successful for ${product.model}: ${enhanceResult.specsAdded || 0} specs`);
          successful++;
        } else {
          console.log(`⚠️ Mixed results for ${product.model}:`, enhanceResult);
        }
        
        processed++;
        
        // Small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Process in smaller batches
        if (processed % 10 === 0) {
          console.log(`📈 Progress: ${processed}/${productsNeedingSpecs.length} processed, ${successful} successful`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        console.error(`❌ Error processing ${product.model}:`, error);
        processed++;
      }
    }

    // Check final results
    let finalStats = { panels: 0, batteries: 0, inverters: 0 };
    for (const product of productsNeedingSpecs) {
      const { count } = await supabase
        .from('specs')
        .select('*', { count: 'exact', head: true })
        .eq('product_id', product.id);
      
      if ((count || 0) >= 6) {
        if (product.category === 'PANEL') finalStats.panels++;
        if (product.category === 'BATTERY_MODULE') finalStats.batteries++;
        if (product.category === 'INVERTER') finalStats.inverters++;
      }
    }

    console.log(`🎉 Real specs extraction completed!`);
    console.log(`📊 Results: ${processed} processed, ${successful} successful API calls`);
    console.log(`✅ Final comprehensive specs: ${finalStats.panels} panels, ${finalStats.batteries} batteries, ${finalStats.inverters} inverters`);
    
    // Update job progress if significant progress was made
    if (successful > 10) {
      await updateJobProgressRealTime();
    }
    
    return {
      success: true,
      processed,
      successful,
      finalStats
    };

  } catch (error) {
    console.error('❌ Real specs extraction failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function updateJobProgressRealTime() {
  try {
    console.log('🔄 Updating job progress with real data...');
    
    // Count actual comprehensive specs
    const { data: panelSpecs } = await supabase
      .from('products')
      .select(`
        id,
        specs!inner(product_id)
      `)
      .eq('category', 'PANEL')
      .eq('status', 'active');

    const { data: batterySpecs } = await supabase
      .from('products')
      .select(`
        id,
        specs!inner(product_id) 
      `)
      .eq('category', 'BATTERY_MODULE')
      .eq('status', 'active');

    const { data: inverterSpecs } = await supabase
      .from('products')
      .select(`
        id,
        specs!inner(product_id) 
      `)
      .eq('category', 'INVERTER')
      .eq('status', 'active');

    // Count products with 6+ specs
    let panelCount = 0;
    let batteryCount = 0;
    let inverterCount = 0;

    if (panelSpecs) {
      for (const product of panelSpecs) {
        const { count } = await supabase
          .from('specs')
          .select('*', { count: 'exact', head: true })
          .eq('product_id', product.id);
        if ((count || 0) >= 6) panelCount++;
      }
    }

    if (batterySpecs) {
      for (const product of batterySpecs) {
        const { count } = await supabase
          .from('specs')
          .select('*', { count: 'exact', head: true })
          .eq('product_id', product.id);
        if ((count || 0) >= 6) batteryCount++;
      }
    }

    if (inverterSpecs) {
      for (const product of inverterSpecs) {
        const { count } = await supabase
          .from('specs')
          .select('*', { count: 'exact', head: true })
          .eq('product_id', product.id);
        if ((count || 0) >= 6) inverterCount++;
      }
    }

    // Update progress with real counts
    const { error: updateError1 } = await supabase
      .from('scrape_job_progress')
      .update({
        specs_done: panelCount,
        state: panelCount >= 1348 ? 'completed' : 'running'
      })
      .eq('category', 'PANEL');

    const { error: updateError2 } = await supabase
      .from('scrape_job_progress')
      .update({
        specs_done: batteryCount,
        state: batteryCount >= 513 ? 'completed' : 'running'
      })
      .eq('category', 'BATTERY_MODULE');

    const { error: updateError3 } = await supabase
      .from('scrape_job_progress')
      .update({
        specs_done: inverterCount,
        state: inverterCount >= 2411 ? 'completed' : 'running'
      })
      .eq('category', 'INVERTER');

    if (updateError1 || updateError2 || updateError3) {
      console.error('❌ Error updating job progress:', updateError1 || updateError2 || updateError3);
    } else {
      console.log(`✅ Progress updated - Panels: ${panelCount}/1348, Batteries: ${batteryCount}/513, Inverters: ${inverterCount}/2411`);
    }

  } catch (error) {
    console.error('❌ Error updating job progress:', error);
  }
}

// Auto-trigger real specs extraction
console.log('⚡ Auto-starting REAL specs extraction...');
extractRealSpecsForProducts().catch(console.error);