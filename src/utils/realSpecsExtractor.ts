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
    
    // Always update job progress to reflect real data
    await updateJobProgressRealTime();
    
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
    
    // Get accurate spec counts using direct query
    const { data: specCounts, error: specError } = await supabase
      .from('products')
      .select(`
        category,
        id
      `)
      .in('category', ['PANEL', 'BATTERY_MODULE', 'INVERTER'])
      .eq('status', 'active');

    if (specError) {
      console.error('Error getting products:', specError);
      return;
    }

    const counts = { PANEL: 0, BATTERY_MODULE: 0, INVERTER: 0 };
    
    if (specCounts) {
      // Count products with 6+ specs
      for (const product of specCounts) {
        const { count } = await supabase
          .from('specs')
          .select('*', { count: 'exact', head: true })
          .eq('product_id', product.id);
        
        if ((count || 0) >= 6) {
          const category = product.category as 'PANEL' | 'BATTERY_MODULE' | 'INVERTER';
          counts[category]++;
        }
      }
    }

    console.log('Real spec counts:', counts);

    // Update scrape_job_progress for the active job
    const { data: activeJob } = await supabase
      .from('scrape_jobs')
      .select('id')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1);

    const jobId = activeJob?.[0]?.id || 'f3376479-2c9c-4e25-8351-c03e72981661';

    // Update progress for each category
    const categoryTargets = { PANEL: 1348, BATTERY_MODULE: 513, INVERTER: 2411 };
    
    for (const [category, count] of Object.entries(counts)) {
      const target = categoryTargets[category as keyof typeof categoryTargets];
      
      const { error } = await supabase
        .from('scrape_job_progress')
        .update({
          specs_done: count,
          state: count >= target ? 'completed' : 'running'
        })
        .eq('category', category)
        .eq('job_id', jobId);

      if (error) {
        console.error(`❌ Error updating ${category} progress:`, error);
      }
    }

    // Update G3 readiness gates
    await updateG3Gates(counts);

    console.log(`✅ Progress updated - Panels: ${counts.PANEL}/1348, Batteries: ${counts.BATTERY_MODULE}/513, Inverters: ${counts.INVERTER}/2411`);

  } catch (error) {
    console.error('❌ Error updating job progress:', error);
  }
}

async function updateG3Gates(counts: { PANEL: number; BATTERY_MODULE: number; INVERTER: number }) {
  try {
    const gates = [
      { name: 'G3_PANEL_SPECS', value: counts.PANEL, required: 1348 },
      { name: 'G3_BATTERY_SPECS', value: counts.BATTERY_MODULE, required: 513 },
      { name: 'G3_INVERTER_SPECS', value: counts.INVERTER, required: 2411 }
    ];

    for (const gate of gates) {
      const { error } = await supabase
        .from('readiness_gates')
        .update({
          current_value: gate.value,
          passing: gate.value >= gate.required,
          last_checked: new Date().toISOString()
        })
        .eq('gate_name', gate.name);

      if (error) {
        console.error(`❌ Error updating gate ${gate.name}:`, error);
      } else {
        console.log(`✅ Updated gate ${gate.name}: ${gate.value}/${gate.required}`);
      }
    }
  } catch (error) {
    console.error('❌ Error updating G3 gates:', error);
  }
}

// Export for manual triggering only

// Export function to update progress without extraction
export async function updateProgressOnly() {
  console.log('🔄 Updating progress and gates with current data...');
  await updateJobProgressRealTime();
  return { success: true, message: 'Progress updated' };
}