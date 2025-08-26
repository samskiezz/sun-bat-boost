import { SiteContext, ProductBasket, DesignResult, TrainingMetrics } from './types';
import { randomSite, randomBasket, generateRealisticStringSizes, generateBatteryStackOptions } from './generator';
import { supabase } from '@/integrations/supabase/client';
import { logEpisode, recordReplay } from './ocr_learn';

export function exploreDesignSpace(ctx: SiteContext, pick: ProductBasket): DesignResult {
  const valid = [];
  const invalid = [];
  
  // Generate multiple design variations
  const variations = generateDesignVariations(ctx, pick);
  
  for (const variation of variations) {
    const validation = validateDesign(ctx, variation);
    
    if (validation.isValid) {
      valid.push({
        choice: variation,
        dcAc: calculateDcAcRatio(variation),
        backupH: calculateBackupHeadroom(ctx, variation),
        hasCitations: variation.citations?.length > 0,
        stackVsWindow: calculateVoltageWindow(variation)
      });
    } else {
      invalid.push({
        choice: variation,
        ruleCode: validation.violatedRule,
        details: validation.details,
        guardCandidate: generateGuardCandidate(validation)
      });
    }
  }
  
  return { valid, invalid };
}

function generateDesignVariations(ctx: SiteContext, pick: ProductBasket) {
  const variations = [];
  
  // Base configuration
  const baseVariation = {
    panelId: pick.panelId,
    inverterId: pick.inverterId,
    batteryId: pick.moduleId,
    panelCount: pick.qty,
    strings: generateRealisticStringSizes(pick.qty),
    batteryStack: pick.moduleId ? generateBatteryStackOptions(10)[0] : null,
    citations: []
  };
  
  variations.push(baseVariation);
  
  // Generate invalid variations for training
  // Voltage window violations
  variations.push({
    ...baseVariation,
    strings: [pick.qty], // Single string - likely voltage violation
  });
  
  // DC:AC ratio violations
  variations.push({
    ...baseVariation,
    panelCount: Math.floor(pick.qty * 1.8), // High DC:AC ratio
  });
  
  // Battery oversizing
  if (pick.moduleId) {
    variations.push({
      ...baseVariation,
      batteryStack: { modules: 8, moduleKwh: 13.5 }, // Very large battery
    });
  }
  
  // String imbalance
  variations.push({
    ...baseVariation,
    strings: [Math.floor(pick.qty * 0.8), Math.floor(pick.qty * 0.2)], // Unbalanced strings
  });
  
  return variations;
}

function validateDesign(ctx: SiteContext, design: any) {
  // Voltage window check
  const stringVoltages = calculateStringVoltages(design, ctx.tempMinC);
  const inverterWindow = getInverterVoltageWindow(design.inverterId);
  
  for (const voltage of stringVoltages) {
    if (voltage.min < inverterWindow.min || voltage.max > inverterWindow.max) {
      return {
        isValid: false,
        violatedRule: 'MPPT_VOLTAGE_WINDOW',
        details: {
          stringVoltage: voltage,
          inverterWindow,
          temperature: ctx.tempMinC
        }
      };
    }
  }
  
  // DC:AC ratio check
  const dcAcRatio = calculateDcAcRatio(design);
  if (dcAcRatio > 1.33 || dcAcRatio < 0.8) {
    return {
      isValid: false,
      violatedRule: 'DC_AC_RATIO',
      details: {
        ratio: dcAcRatio,
        limit: { min: 0.8, max: 1.33 }
      }
    };
  }
  
  // Battery backup headroom
  if (design.batteryStack) {
    const backupH = calculateBackupHeadroom(ctx, design);
    if (backupH < 0.1) { // Less than 10% headroom
      return {
        isValid: false,
        violatedRule: 'BACKUP_HEADROOM',
        details: {
          headroom: backupH,
          minRequired: 0.1
        }
      };
    }
  }
  
  return { isValid: true };
}

function calculateStringVoltages(design: any, tempMinC: number) {
  // Simplified voltage calculation
  const panelVmp = 40; // Typical Vmp for modern panels
  const panelVoc = 48; // Typical Voc
  const tempCoeff = -0.0032; // Temperature coefficient per °C
  
  return design.strings.map((stringSize: number) => {
    const vmpAtTemp = panelVmp * stringSize * (1 + tempCoeff * (tempMinC - 25));
    const vocAtTemp = panelVoc * stringSize * (1 + tempCoeff * (tempMinC - 25));
    
    return {
      min: vmpAtTemp * 0.9, // MPPT tracking range
      max: vocAtTemp * 1.1, // Safety margin
      stringSize
    };
  });
}

function getInverterVoltageWindow(inverterId?: string) {
  // Default MPPT window - would be looked up from database in real implementation
  return {
    min: 120,
    max: 550
  };
}

function calculateDcAcRatio(design: any): number {
  const panelWattage = 400; // Would be looked up from database
  const inverterRating = 5000; // Would be looked up from database
  
  return (design.panelCount * panelWattage) / inverterRating;
}

function calculateBackupHeadroom(ctx: SiteContext, design: any): number {
  if (!design.batteryStack) return 1;
  
  const totalLoad = ctx.loadDayKwh + ctx.loadNightKwh;
  const batteryCapacity = design.batteryStack.modules * design.batteryStack.moduleKwh;
  
  return Math.max(0, (batteryCapacity - totalLoad * 0.3) / batteryCapacity);
}

function calculateVoltageWindow(design: any) {
  const window = getInverterVoltageWindow(design.inverterId);
  const center = (window.max + window.min) / 2;
  const span = window.max - window.min;
  
  return { center, span };
}

function generateGuardCandidate(validation: any) {
  // Generate UI constraint expression from validation failure
  switch (validation.violatedRule) {
    case 'MPPT_VOLTAGE_WINDOW':
      return {
        scope: 'STRINGING',
        expression: {
          when: { scope: 'STRINGING' },
          if: {
            'calc.string_v_min': { $gte: '$inv.mppt_min_v' },
            'calc.string_v_max': { $lte: '$inv.mppt_max_v' }
          },
          elseBlock: {
            message: 'String voltage {string_v_min}–{string_v_max}V outside MPPT window {mppt_min_v}–{mppt_max_v}V',
            reason: {
              productId: validation.details.inverterId,
              key: 'inv.mppt_min_v',
              expected: validation.details.inverterWindow,
              actual: validation.details.stringVoltage
            }
          }
        }
      };
      
    case 'DC_AC_RATIO':
      return {
        scope: 'STACK_PICKER',
        expression: {
          when: { scope: 'STACK_PICKER' },
          if: {
            'calc.dc_ac_ratio': { $gte: 0.8, $lte: 1.33 }
          },
          elseBlock: {
            message: 'DC:AC ratio {dc_ac_ratio} outside recommended range 0.8–1.33',
            reason: {
              key: 'calc.dc_ac_ratio',
              expected: { min: 0.8, max: 1.33 },
              actual: validation.details.ratio
            }
          }
        }
      };
      
    default:
      return null;
  }
}

export async function designPracticeBatch(): Promise<void> {
  console.log('🏗️ Starting design practice batch...');
  
  const batchSize = parseInt(process.env.TRAINER_MAX_EPISODES_PER_RUN || '50');
  
  for (let i = 0; i < batchSize; i++) {
    try {
      const ctx = randomSite();
      const pick = randomBasket();
      
      const results = exploreDesignSpace(ctx, pick);
      const reward = rewardFromDesign(results);
      
      // Record violations for rule synthesis
      for (const invalid of results.invalid) {
        await recordReplay(
          { correct: 0, incorrect: 1, missed: 0, docSpansCaptured: false },
          { ctx, pick, violation: invalid },
          { ruleCode: invalid.ruleCode, details: invalid.details }
        );
      }
      
      await logEpisode('DESIGN', { ctx, pick }, results, reward);
      
      console.log(`🏗️ Design episode: Reward ${reward}, Valid: ${results.valid.length}, Invalid: ${results.invalid.length}`);
      
    } catch (error) {
      console.error('Design training episode failed:', error);
    }
  }
  
  console.log('✅ Design practice batch completed');
}

function rewardFromDesign(results: DesignResult): number {
  const validChosen = results.valid.length > 0;
  const ok = validChosen ? 2 : -3;
  
  if (!validChosen) return ok;
  
  const best = results.valid[0];
  const ratio = scoreDcAc(best.dcAc);
  const head = scoreHeadroom(best.backupH);
  const center = scoreVoltageCentering(best.stackVsWindow);
  const explain = best.hasCitations ? 0.3 : 0;
  const blocked = results.invalid.length > 0 ? 0.5 : -0.5; // Penalize if invalid options exist
  
  return ok + ratio + head + center + explain + blocked;
}

function scoreDcAc(ratio: number): number {
  // Optimal DC:AC ratio is 1.1-1.3
  if (ratio >= 1.1 && ratio <= 1.3) return 1;
  if (ratio >= 1.0 && ratio <= 1.4) return 0.5;
  return 0;
}

function scoreHeadroom(headroom: number): number {
  // 20% headroom is ideal
  if (headroom >= 0.2) return 1;
  if (headroom >= 0.1) return 0.5;
  return 0;
}

function scoreVoltageCentering(window: { center: number; span: number }): number {
  // Reward voltage centering in MPPT window
  return Math.min(1, window.center / window.span);
}