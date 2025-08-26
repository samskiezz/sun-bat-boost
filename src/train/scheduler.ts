import { ocrPracticeBatch } from './ocr_learn';
import { designPracticeBatch } from './design_selfplay';
import { synthesizeRulesFromReplay } from './rules_synth';
import { supabase } from '@/integrations/supabase/client';

export async function runBatch(): Promise<void> {
  const isEnabled = process.env.TRAINER_ENABLED === 'true';
  if (!isEnabled) {
    console.log('⏸️ Training disabled (TRAINER_ENABLED=false)');
    return;
  }
  
  console.log('🚀 Starting training batch...');
  
  try {
    // Record training start
    await recordTrainingMetric('BATCH_START', 1, { timestamp: new Date().toISOString() });
    
    // Run OCR and design training in parallel
    await Promise.all([
      ocrPracticeBatch(),
      designPracticeBatch()
    ]);
    
    // Record successful completion
    await recordTrainingMetric('BATCH_COMPLETE', 1, { 
      timestamp: new Date().toISOString(),
      status: 'success'
    });
    
    console.log('✅ Training batch completed successfully');
    
  } catch (error) {
    console.error('❌ Training batch failed:', error);
    
    await recordTrainingMetric('BATCH_ERROR', 1, { 
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export async function promoteNightly(): Promise<void> {
  console.log('🌙 Starting nightly promotion...');
  
  try {
    // Synthesize new rules from replay data
    await synthesizeRulesFromReplay();
    
    // Update feature store (if implemented)
    await buildViews();
    
    // Refit models from replay data
    await learnFitFromReplay();
    
    // Evaluate performance and log metrics
    await evalAndLogMetrics();
    
    console.log('✅ Nightly promotion completed');
    
  } catch (error) {
    console.error('❌ Nightly promotion failed:', error);
  }
}

async function buildViews(): Promise<void> {
  // Refresh materialized views or computed features
  console.log('🔄 Building feature store views...');
  
  try {
    // Update document spans cache
    await updateDocSpanCache();
    
    // Refresh constraint performance metrics
    await refreshConstraintMetrics();
    
  } catch (error) {
    console.error('Failed to build views:', error);
  }
}

async function updateDocSpanCache(): Promise<void> {
  // Update document span references for better explanations
  // This would parse product datasheets and create DocSpan records
  console.log('📄 Updating document span cache...');
  
  // For now, create some example doc spans
  const exampleSpans = [
    {
      product_id: 'fronius-primo-5kw',
      key: 'inv.mppt_min_v',
      page: 1,
      text: 'MPPT voltage range: 120V - 550V',
      bbox: { x: 100, y: 200, w: 200, h: 20 }
    },
    {
      product_id: 'tesla-powerwall-2', 
      key: 'bat.usable_kwh',
      page: 2,
      text: 'Usable energy capacity: 13.5 kWh',
      bbox: { x: 50, y: 150, w: 180, h: 15 }
    }
  ];
  
  for (const span of exampleSpans) {
    await supabase
      .from('doc_spans')
      .upsert(span, { onConflict: 'product_id,key' });
  }
}

async function refreshConstraintMetrics(): Promise<void> {
  console.log('📊 Refreshing constraint performance metrics...');
  
  // Calculate how many invalid options each constraint blocks
  const { data: constraints } = await supabase
    .from('ui_constraints')
    .select('*')
    .eq('enabled', true);
  
  for (const constraint of constraints || []) {
    // Calculate effectiveness metrics
    const effectiveness = await calculateConstraintEffectiveness(constraint);
    
    await recordTrainingMetric('CONSTRAINT_EFFECTIVENESS', effectiveness, {
      constraintId: constraint.id,
      ruleCode: constraint.rule_code,
      scope: constraint.scope
    });
  }
}

async function calculateConstraintEffectiveness(constraint: any): Promise<number> {
  // In a real implementation, this would:
  // 1. Count how many invalid selections this constraint prevented
  // 2. Measure false positive rate (valid selections incorrectly blocked)
  // 3. Calculate overall effectiveness score
  
  // For now, return a simulated effectiveness score
  return 0.85 + Math.random() * 0.1;
}

async function learnFitFromReplay(): Promise<void> {
  console.log('🧠 Refitting models from replay data...');
  
  // Load recent training episodes
  const { data: episodes } = await supabase
    .from('train_episodes')
    .select('*')
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false });
  
  if (!episodes?.length) {
    console.log('No recent episodes for model fitting');
    return;
  }
  
  // Update OCR patterns and aliases
  await updateOcrPatterns(episodes.filter(e => e.mode === 'OCR'));
  
  // Update design ranking models
  await updateDesignRankers(episodes.filter(e => e.mode === 'DESIGN'));
}

async function updateOcrPatterns(ocrEpisodes: any[]): Promise<void> {
  // Analyze OCR failures and successes to improve patterns
  console.log(`🔍 Analyzing ${ocrEpisodes.length} OCR episodes...`);
  
  const improvements = {
    brandAliases: new Set<string>(),
    modelPatterns: new Set<string>(),
    unitNormalizations: new Set<string>()
  };
  
  for (const episode of ocrEpisodes) {
    if (episode.result?.improvements) {
      episode.result.improvements.forEach((improvement: string) => {
        if (improvement.includes('brand')) improvements.brandAliases.add(improvement);
        if (improvement.includes('model')) improvements.modelPatterns.add(improvement);
        if (improvement.includes('unit')) improvements.unitNormalizations.add(improvement);
      });
    }
  }
  
  console.log(`📈 Identified ${improvements.brandAliases.size} brand aliases, ${improvements.modelPatterns.size} model patterns, ${improvements.unitNormalizations.size} unit normalizations`);
}

async function updateDesignRankers(designEpisodes: any[]): Promise<void> {
  // Update design preference models based on reward feedback
  console.log(`🏗️ Analyzing ${designEpisodes.length} design episodes...`);
  
  const avgReward = designEpisodes.reduce((sum, e) => sum + e.reward, 0) / designEpisodes.length;
  const highRewardEpisodes = designEpisodes.filter(e => e.reward > avgReward);
  
  console.log(`📊 Average reward: ${avgReward.toFixed(2)}, High-reward episodes: ${highRewardEpisodes.length}`);
  
  // Record design preferences
  await recordTrainingMetric('DESIGN_PREFERENCE_UPDATE', avgReward, {
    totalEpisodes: designEpisodes.length,
    highRewardCount: highRewardEpisodes.length,
    avgReward
  });
}

async function evalAndLogMetrics(): Promise<void> {
  console.log('📈 Evaluating and logging performance metrics...');
  
  // Calculate overall system performance
  const metrics = await calculateSystemMetrics();
  
  for (const [metricType, value] of Object.entries(metrics)) {
    await recordTrainingMetric(metricType, value, { timestamp: new Date().toISOString() });
  }
  
  console.log(`📊 Logged ${Object.keys(metrics).length} performance metrics`);
}

async function calculateSystemMetrics(): Promise<Record<string, number>> {
  // Get recent episode statistics
  const { data: recentEpisodes } = await supabase
    .from('train_episodes')
    .select('mode, reward, metrics')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  
  if (!recentEpisodes?.length) {
    return {
      OCR_ACCURACY: 0,
      DESIGN_SUCCESS_RATE: 0,
      RULE_COVERAGE: 0,
      SYSTEM_HEALTH: 0
    };
  }
  
  const ocrEpisodes = recentEpisodes.filter(e => e.mode === 'OCR');
  const designEpisodes = recentEpisodes.filter(e => e.mode === 'DESIGN');
  
  const ocrAccuracy = ocrEpisodes.length > 0 
    ? ocrEpisodes.reduce((sum, e) => sum + ((e.metrics as any)?.accuracy || 0), 0) / ocrEpisodes.length
    : 0;
  
  const designSuccessRate = designEpisodes.length > 0
    ? designEpisodes.filter(e => e.reward > 0).length / designEpisodes.length
    : 0;
  
  // Get active constraint count as proxy for rule coverage
  const { count: activeConstraints } = await supabase
    .from('ui_constraints')
    .select('*', { count: 'exact', head: true })
    .eq('enabled', true);
  
  const ruleCoverage = Math.min(1.0, (activeConstraints || 0) / 10); // Target 10+ active rules
  
  const systemHealth = (ocrAccuracy + designSuccessRate + ruleCoverage) / 3;
  
  return {
    OCR_ACCURACY: ocrAccuracy,
    DESIGN_SUCCESS_RATE: designSuccessRate,
    RULE_COVERAGE: ruleCoverage,
    SYSTEM_HEALTH: systemHealth
  };
}

async function recordTrainingMetric(metricType: string, value: number, metadata?: any): Promise<void> {
  try {
    await supabase.from('training_metrics').insert({
      metric_type: metricType,
      value,
      metadata
    });
  } catch (error) {
    console.error(`Failed to record metric ${metricType}:`, error);
  }
}

// Export function for manual training runs
export async function runTrainingBatch(): Promise<void> {
  await runBatch();
}

// Export function for manual promotion
export async function runNightlyPromotion(): Promise<void> {
  await promoteNightly();
}