import { OCRDeltas, TrainingMetrics } from './types';
import { mutateForOcr, synthProposalFromSpec, injectCommonOCRErrors } from './ocr_synth';
import { supabase } from '@/integrations/supabase/client';
import { extractProposalEntities } from '@/utils/masterOCRPipeline';

interface OCRTrainingCase {
  pdfPath?: string;
  text: string;
  groundTruth: {
    panels?: {
      brand: string;
      model: string;
      count: number;
      wattage: number;
    };
    battery?: {
      brand: string;
      model: string;
      usableKWh: number;
    };
    inverter?: {
      brand: string;
      model: string;
      phases: 'SINGLE' | 'THREE';
      ratedKw: number;
    };
  };
}

export async function sampleMixedRealAndSynthetic(count: number): Promise<OCRTrainingCase[]> {
  const cases: OCRTrainingCase[] = [];
  
  // Generate synthetic cases (70% of training data)
  const syntheticCount = Math.floor(count * 0.7);
  for (let i = 0; i < syntheticCount; i++) {
    const productIds = [
      'trina-vertex-s-400w',
      'fronius-primo-5kw',
      'tesla-powerwall-2'
    ];
    
    const synthetic = await synthProposalFromSpec(productIds);
    const noisyText = injectCommonOCRErrors(mutateForOcr(synthetic.text, 'medium'));
    
    cases.push({
      text: noisyText,
      groundTruth: {
        panels: {
          brand: 'Trina',
          model: 'Vertex S',
          count: 20,
          wattage: 400
        },
        battery: {
          brand: 'Tesla',
          model: 'Powerwall 2',
          usableKWh: 13.5
        },
        inverter: {
          brand: 'Fronius',
          model: 'Primo',
          phases: 'SINGLE',
          ratedKw: 5
        }
      }
    });
  }
  
  // TODO: Add real document sampling from uploaded files
  // For now, pad with more synthetic variations
  while (cases.length < count) {
    const existing = cases[Math.floor(Math.random() * cases.length)];
    const renoised = mutateForOcr(existing.text, 'high');
    cases.push({
      ...existing,
      text: renoised
    });
  }
  
  return cases;
}

export function compareEntities(parsed: any, truth: OCRTrainingCase['groundTruth']): OCRDeltas {
  let correct = 0;
  let incorrect = 0;
  let missed = 0;
  let docSpansCaptured = false;
  
  // Check panels
  if (truth.panels) {
    if (parsed.panels?.best) {
      if (parsed.panels.best.brand?.toLowerCase().includes(truth.panels.brand.toLowerCase())) correct++;
      else if (parsed.panels.best.brand) incorrect++;
      else missed++;
      
      if (parsed.panels.best.count === truth.panels.count) correct++;
      else if (parsed.panels.best.count) incorrect++;
      else missed++;
      
      if (parsed.panels.best.wattage === truth.panels.wattage) correct++;
      else if (parsed.panels.best.wattage) incorrect++;
      else missed++;
      
      // Check if evidences contain document spans
      if (parsed.panels.best.evidences?.length > 0) {
        docSpansCaptured = true;
      }
    } else {
      missed += 3; // brand, count, wattage
    }
  }
  
  // Check battery
  if (truth.battery) {
    if (parsed.battery?.best) {
      if (parsed.battery.best.brand?.toLowerCase().includes(truth.battery.brand.toLowerCase())) correct++;
      else if (parsed.battery.best.brand) incorrect++;
      else missed++;
      
      const usableMatch = Math.abs((parsed.battery.best.usableKWh || 0) - truth.battery.usableKWh) < 1;
      if (usableMatch) correct++;
      else if (parsed.battery.best.usableKWh) incorrect++;
      else missed++;
    } else {
      missed += 2; // brand, capacity
    }
  }
  
  // Check inverter
  if (truth.inverter) {
    if (parsed.inverter?.value) {
      if (parsed.inverter.value.brandRaw?.toLowerCase().includes(truth.inverter.brand.toLowerCase())) correct++;
      else if (parsed.inverter.value.brandRaw) incorrect++;
      else missed++;
      
      const ratingMatch = Math.abs((parsed.inverter.value.ratedKw || 0) - truth.inverter.ratedKw) < 0.5;
      if (ratingMatch) correct++;
      else if (parsed.inverter.value.ratedKw) incorrect++;
      else missed++;
    } else {
      missed += 2; // brand, rating
    }
  }
  
  return { correct, incorrect, missed, docSpansCaptured };
}

export async function recordReplay(deltas: OCRDeltas, context: any, parsed: any): Promise<void> {
  try {
    const kind = deltas.incorrect > deltas.correct ? 'OCR_FAIL' : 'OCR_FIX';
    
    await supabase.from('replay_items').insert({
      kind,
      payload: JSON.parse(JSON.stringify({
        deltas,
        context,
        parsed,
        timestamp: new Date().toISOString()
      }))
    });
  } catch (error) {
    console.error('Failed to record replay item:', error);
  }
}

export async function proposeAliasImprovements(deltas: OCRDeltas): Promise<string[]> {
  // Analyze failures and propose new regex patterns or aliases
  const improvements: string[] = [];
  
  if (deltas.incorrect > 0) {
    improvements.push('Consider adding brand name variations to regex patterns');
    improvements.push('Check for OCR-specific character substitutions (O/0, l/1)');
    improvements.push('Add unit normalization for kW/kVV/KW variations');
  }
  
  if (deltas.missed > 0) {
    improvements.push('Expand model name matching patterns');
    improvements.push('Add quantity extraction from table contexts');
    improvements.push('Improve multi-line specification parsing');
  }
  
  return improvements;
}

export async function logEpisode(
  mode: 'OCR' | 'DESIGN',
  context: any,
  result: any,
  reward: number
): Promise<void> {
  try {
    const metrics: TrainingMetrics = {
      accuracy: result.accuracy || 0,
      coverage: result.coverage || 0,
      ruleViolations: result.ruleViolations || 0,
      roiProxy: result.roiProxy || 0
    };
    
    await supabase.from('train_episodes').insert({
      mode,
      context: JSON.parse(JSON.stringify(context)),
      result: JSON.parse(JSON.stringify(result)),
      reward,
      metrics: JSON.parse(JSON.stringify(metrics))
    });
  } catch (error) {
    console.error('Failed to log training episode:', error);
  }
}

export async function ocrPracticeBatch(): Promise<void> {
  console.log('🤖 Starting OCR practice batch...');
  
  const batchSize = parseInt(process.env.TRAINER_MAX_EPISODES_PER_RUN || '50');
  const cases = await sampleMixedRealAndSynthetic(batchSize);
  
  for (const testCase of cases) {
    try {
      const parsed = await extractProposalEntities(testCase.text);
      const deltas = compareEntities(parsed, testCase.groundTruth);
      
      await recordReplay(deltas, testCase, parsed);
      
      const improvements = await proposeAliasImprovements(deltas);
      
      const reward = rewardFromOcr(deltas);
      await logEpisode('OCR', testCase, { parsed, deltas, improvements }, reward);
      
      console.log(`📊 OCR episode: Reward ${reward}, Correct: ${deltas.correct}, Incorrect: ${deltas.incorrect}`);
      
    } catch (error) {
      console.error('OCR training episode failed:', error);
    }
  }
  
  console.log('✅ OCR practice batch completed');
}

function rewardFromOcr(deltas: OCRDeltas): number {
  const base = deltas.correct * 1 - deltas.incorrect * 2 - deltas.missed * 1;
  const cite = deltas.docSpansCaptured ? 0.2 : 0;
  return base + cite;
}