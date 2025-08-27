import { OCRDeltas, TrainingMetrics } from './types';
import { mutateForOcr, synthProposalFromSpec, injectCommonOCRErrors } from './ocr_synth';
import { supabase } from '@/integrations/supabase/client';
import { masterOCRPipeline } from '@/utils/masterOCRPipeline';

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
  
  // Generate diverse synthetic cases (80% of training data)
  const syntheticCount = Math.floor(count * 0.8);
  for (let i = 0; i < syntheticCount; i++) {
    const synthetic = await synthProposalFromSpec();
    
    // Apply different noise levels for variety
    const noiseLevel = ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as any;
    let noisyText = mutateForOcr(synthetic.text, noiseLevel);
    
    // 50% chance to add common OCR errors specific to solar equipment
    if (Math.random() > 0.5) {
      noisyText = injectCommonOCRErrors(noisyText);
    }
    
    // Add solar-specific OCR corruption
    noisyText = addSolarSpecificErrors(noisyText);
    
    const groundTruth = (synthetic as any).groundTruth;
    cases.push({
      text: noisyText,
      groundTruth: {
        panels: {
          brand: groundTruth.panel.brand,
          model: groundTruth.panel.model,
          count: groundTruth.panelQty,
          wattage: groundTruth.panel.watts
        },
        battery: {
          brand: groundTruth.battery.brand,
          model: groundTruth.battery.model,
          usableKWh: groundTruth.battery.kwh
        },
        inverter: {
          brand: groundTruth.inverter.brand,
          model: groundTruth.inverter.model,
          phases: Math.random() > 0.7 ? 'THREE' : 'SINGLE',
          ratedKw: groundTruth.inverter.kw
        }
      }
    });
  }
  
  // Add real document sampling from replay items (failed OCR cases)
  try {
    const { data: replayItems } = await supabase
      .from('replay_items')
      .select('payload')
      .eq('kind', 'OCR_FAIL')
      .limit(Math.floor(count * 0.2));
    
    if (replayItems && replayItems.length > 0) {
      for (const item of replayItems.slice(0, count - cases.length)) {
        const payload = item.payload as any;
        if (payload.context && payload.context.text) {
          // Re-train on previously failed cases with corrected ground truth
          cases.push({
            text: payload.context.text,
            groundTruth: payload.context.groundTruth || generateFallbackGroundTruth(payload.context.text)
          });
        }
      }
    }
  } catch (error) {
    console.warn('Could not load replay items for training:', error);
  }
  
  // Pad with more synthetic variations if needed
  while (cases.length < count) {
    const existing = cases[Math.floor(Math.random() * Math.min(cases.length, syntheticCount))];
    const renoised = mutateForOcr(existing.text, 'high');
    cases.push({
      ...existing,
      text: addSolarSpecificErrors(renoised)
    });
  }
  
  return cases;
}

function addSolarSpecificErrors(text: string): string {
  let corrupted = text;
  
  // Solar brand name corruptions
  const solarBrandCorruptions = {
    'TRINA': ['TRJNA', 'TRICA', 'TRlNA', 'TRINA SOLAR'],
    'JINKO': ['JJNKO', 'JINKO SOLAR', 'JlNKO', 'JINK0'],
    'CANADIAN SOLAR': ['CANADIAN S0LAR', 'CANADIAN SOIAR', 'CAN SOLAR'],
    'LONGI': ['L0NGI', 'LONGI SOLAR', 'LQNGl'],
    'FRONIUS': ['FR0NIUS', 'FRONUIS', 'FRONJUS', 'FRQNIUS'],
    'SMA': ['S.M.A', 'SMA SOLAR', 'S MA'],
    'SUNGROW': ['SUN GROW', 'SUNGR0W', 'SUNGROVV'],
    'TESLA': ['TESLLA', 'TESLAj', 'TESLA ENERGY'],
    'PYLONTECH': ['PYLON TECH', 'PYL0NTECH', 'PYLQNTECH'],
    'ENPHASE': ['EN PHASE', 'ENPEASE', 'ENPH4SE']
  };
  
  Object.entries(solarBrandCorruptions).forEach(([brand, corruptions]) => {
    if (corrupted.includes(brand) && Math.random() < 0.3) {
      const corruption = corruptions[Math.floor(Math.random() * corruptions.length)];
      corrupted = corrupted.replace(new RegExp(brand, 'g'), corruption);
    }
  });
  
  // Model number corruptions (common OCR errors in alphanumeric strings)
  corrupted = corrupted.replace(/(\w+)(\d+)(\w*)/g, (match, prefix, digits, suffix) => {
    if (Math.random() < 0.2) {
      // Corrupt digits: 0->O, 1->I, 5->S, 6->G, 8->B
      const corruptedDigits = digits
        .replace(/0/g, Math.random() < 0.5 ? 'O' : '0')
        .replace(/1/g, Math.random() < 0.5 ? 'I' : '1')
        .replace(/5/g, Math.random() < 0.3 ? 'S' : '5')
        .replace(/6/g, Math.random() < 0.3 ? 'G' : '6')
        .replace(/8/g, Math.random() < 0.3 ? 'B' : '8');
      return prefix + corruptedDigits + suffix;
    }
    return match;
  });
  
  // Specification unit corruptions
  corrupted = corrupted.replace(/(\d+(?:\.\d+)?)\s*(kW|KW|kw)/g, (match, number, unit) => {
    if (Math.random() < 0.25) {
      const unitCorruptions = ['kVV', 'KVV', 'kVW', 'kW', 'KW', 'kw', 'k W', 'kW '];
      const corruptedUnit = unitCorruptions[Math.floor(Math.random() * unitCorruptions.length)];
      return number + ' ' + corruptedUnit;
    }
    return match;
  });
  
  corrupted = corrupted.replace(/(\d+(?:\.\d+)?)\s*(kWh|KWH|kwh)/g, (match, number, unit) => {
    if (Math.random() < 0.25) {
      const unitCorruptions = ['kVVh', 'KVVh', 'kWH', 'KWH', 'kwh', 'k Wh', 'kW h', 'kWhj'];
      const corruptedUnit = unitCorruptions[Math.floor(Math.random() * unitCorruptions.length)];
      return number + ' ' + corruptedUnit;
    }
    return match;
  });
  
  return corrupted;
}

function generateFallbackGroundTruth(text: string): OCRTrainingCase['groundTruth'] {
  // Extract basic info from failed OCR text to create training data
  const panelMatch = text.match(/(\w+)\s+(\w+)\s+(\d+)W/i);
  const batteryMatch = text.match(/(\w+)\s+(\w+)\s+(\d+(?:\.\d+)?)\s*kwh/i);
  const inverterMatch = text.match(/(\w+)\s+(\w+)\s+(\d+(?:\.\d+)?)\s*kw/i);
  
  return {
    panels: panelMatch ? {
      brand: panelMatch[1],
      model: panelMatch[2],
      count: 20,
      wattage: parseInt(panelMatch[3])
    } : undefined,
    battery: batteryMatch ? {
      brand: batteryMatch[1],
      model: batteryMatch[2],
      usableKWh: parseFloat(batteryMatch[3])
    } : undefined,
    inverter: inverterMatch ? {
      brand: inverterMatch[1],
      model: inverterMatch[2],
      phases: 'SINGLE' as const,
      ratedKw: parseFloat(inverterMatch[3])
    } : undefined
  };
}

export function compareEntities(parsed: any, truth: OCRTrainingCase['groundTruth']): OCRDeltas {
  let correct = 0;
  let incorrect = 0;
  let missed = 0;
  let docSpansCaptured = false;
  
  // Check panels - adapt to masterOCRPipeline output format
  if (truth.panels) {
    if (parsed.panels?.length > 0) {
      const panel = parsed.panels[0];
      if (panel.brand?.toLowerCase().includes(truth.panels.brand.toLowerCase())) correct++;
      else if (panel.brand) incorrect++;
      else missed++;
      
      if (panel.specs?.watts === truth.panels.wattage) correct++;
      else if (panel.specs?.watts) incorrect++;
      else missed++;
      
      // Check if evidence exists
      if (panel.evidence?.length > 0) {
        docSpansCaptured = true;
      }
    } else {
      missed += 2; // brand, wattage
    }
  }
  
  // Check battery
  if (truth.battery) {
    if (parsed.batteries?.length > 0) {
      const battery = parsed.batteries[0];
      if (battery.brand?.toLowerCase().includes(truth.battery.brand.toLowerCase())) correct++;
      else if (battery.brand) incorrect++;
      else missed++;
      
      const usableMatch = Math.abs((battery.specs?.kWh || 0) - truth.battery.usableKWh) < 1;
      if (usableMatch) correct++;
      else if (battery.specs?.kWh) incorrect++;
      else missed++;
    } else {
      missed += 2; // brand, capacity
    }
  }
  
  // Check inverter
  if (truth.inverter) {
    if (parsed.inverters?.length > 0) {
      const inverter = parsed.inverters[0];
      if (inverter.brand?.toLowerCase().includes(truth.inverter.brand.toLowerCase())) correct++;
      else if (inverter.brand) incorrect++;
      else missed++;
      
      const ratingMatch = Math.abs((inverter.specs?.kW || 0) - truth.inverter.ratedKw) < 0.5;
      if (ratingMatch) correct++;
      else if (inverter.specs?.kW) incorrect++;
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
  console.log('🤖 Starting Enhanced OCR practice batch for solar product detection...');
  
  const batchSize = parseInt(process.env.TRAINER_MAX_EPISODES_PER_RUN || '100');
  const cases = await sampleMixedRealAndSynthetic(batchSize);
  
  let totalCorrect = 0;
  let totalIncorrect = 0;
  let totalMissed = 0;
  let panelDetections = 0;
  let batteryDetections = 0;
  let inverterDetections = 0;
  
  for (const testCase of cases) {
    try {
      // Create a mock file from text for the OCR pipeline
      const mockFile = new File([testCase.text], 'test-proposal.txt', { type: 'text/plain' });
      const parsed = await masterOCRPipeline.process(mockFile);
      const deltas = compareEntities(parsed, testCase.groundTruth);
      
      // Track detection statistics
      totalCorrect += deltas.correct;
      totalIncorrect += deltas.incorrect;
      totalMissed += deltas.missed;
      
      if (parsed.panels?.length > 0) panelDetections++;
      if (parsed.batteries?.length > 0) batteryDetections++;
      if (parsed.inverters?.length > 0) inverterDetections++;
      
      // Record both successes and failures for learning
      await recordReplay(deltas, { 
        ...testCase, 
        ocrMethod: 'training',
        documentType: 'proposal' 
      }, parsed);
      
      const improvements = await proposeAliasImprovements(deltas);
      
      // Enhanced reward function for solar product detection
      const reward = calculateEnhancedOcrReward(deltas, parsed, testCase.groundTruth);
      
      await logEpisode('OCR', testCase, { 
        parsed, 
        deltas, 
        improvements,
        detectionStats: {
          panelFound: parsed.panels?.length > 0,
          batteryFound: parsed.batteries?.length > 0,
          inverterFound: parsed.inverters?.length > 0
        }
      }, reward);
      
      console.log(`📊 OCR episode: Reward ${reward.toFixed(2)}, Correct: ${deltas.correct}, Incorrect: ${deltas.incorrect}, Missed: ${deltas.missed}`);
      
    } catch (error) {
      console.error('OCR training episode failed:', error);
    }
  }
  
  // Log batch summary
  const totalCases = cases.length;
  const accuracy = totalCorrect / (totalCorrect + totalIncorrect + totalMissed);
  const detectionRate = (panelDetections + batteryDetections + inverterDetections) / (totalCases * 3);
  
  console.log(`✅ OCR practice batch completed:`);
  console.log(`   📈 Overall Accuracy: ${(accuracy * 100).toFixed(1)}%`);
  console.log(`   🎯 Detection Rate: ${(detectionRate * 100).toFixed(1)}%`);
  console.log(`   🔋 Panels: ${panelDetections}/${totalCases}, Batteries: ${batteryDetections}/${totalCases}, Inverters: ${inverterDetections}/${totalCases}`);
  
  // Update training metrics
  try {
    await supabase.from('training_metrics').insert([
      { metric_type: 'ocr_batch_accuracy', value: accuracy },
      { metric_type: 'ocr_detection_rate', value: detectionRate },
      { metric_type: 'ocr_panel_detection', value: panelDetections / totalCases },
      { metric_type: 'ocr_battery_detection', value: batteryDetections / totalCases },
      { metric_type: 'ocr_inverter_detection', value: inverterDetections / totalCases }
    ]);
  } catch (error) {
    console.warn('Failed to log training metrics:', error);
  }
}

function calculateEnhancedOcrReward(deltas: OCRDeltas, parsed: any, groundTruth: OCRTrainingCase['groundTruth']): number {
  let reward = 0;
  
  // Base accuracy reward
  const accuracy = deltas.correct / Math.max(1, deltas.correct + deltas.incorrect + deltas.missed);
  reward += accuracy * 10;
  
  // Product type detection bonuses
  if (groundTruth.panels && parsed.panels?.length > 0) reward += 3; // Panel detection bonus
  if (groundTruth.battery && parsed.batteries?.length > 0) reward += 3; // Battery detection bonus  
  if (groundTruth.inverter && parsed.inverters?.length > 0) reward += 3; // Inverter detection bonus
  
  // Brand/model accuracy bonuses
  if (groundTruth.panels && parsed.panels?.length > 0) {
    const panel = parsed.panels[0];
    if (panel.brand?.toLowerCase().includes(groundTruth.panels.brand.toLowerCase())) reward += 2;
    if (panel.model?.toLowerCase().includes(groundTruth.panels.model.toLowerCase())) reward += 2;
  }
  
  if (groundTruth.battery && parsed.batteries?.length > 0) {
    const battery = parsed.batteries[0];
    if (battery.brand?.toLowerCase().includes(groundTruth.battery.brand.toLowerCase())) reward += 2;
    if (battery.model?.toLowerCase().includes(groundTruth.battery.model.toLowerCase())) reward += 2;
  }
  
  if (groundTruth.inverter && parsed.inverters?.length > 0) {
    const inverter = parsed.inverters[0];
    if (inverter.brand?.toLowerCase().includes(groundTruth.inverter.brand.toLowerCase())) reward += 2;
    if (inverter.model?.toLowerCase().includes(groundTruth.inverter.model.toLowerCase())) reward += 2;
  }
  
  // Evidence quality bonus
  if (deltas.docSpansCaptured) reward += 1;
  
  // Penalty for misdetections
  reward -= deltas.incorrect * 2;
  reward -= deltas.missed * 1;
  
  return Math.max(0, reward);
}

function rewardFromOcr(deltas: OCRDeltas): number {
  const base = deltas.correct * 1 - deltas.incorrect * 2 - deltas.missed * 1;
  const cite = deltas.docSpansCaptured ? 0.2 : 0;
  return base + cite;
}