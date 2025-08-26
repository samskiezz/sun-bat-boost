import { supabase } from '@/integrations/supabase/client';
import { UiConstraint } from '@/train/types';
import { ReactNode } from 'react';

let constraintsCache: UiConstraint[] = [];
let lastCacheUpdate = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function loadUiConstraints(): Promise<UiConstraint[]> {
  const now = Date.now();
  
  if (constraintsCache.length > 0 && now - lastCacheUpdate < CACHE_TTL) {
    return constraintsCache;
  }
  
  try {
    const { data } = await supabase
      .from('ui_constraints')
      .select('*')
      .eq('enabled', true)
      .order('confidence', { ascending: false });
    
    if (data) {
      constraintsCache = data.map(row => ({
        id: row.id,
        scope: row.scope as any,
        ruleCode: row.rule_code,
        expression: row.expression,
        reason: row.reason as any,
        enabled: row.enabled,
        confidence: row.confidence || 0
      }));
      lastCacheUpdate = now;
    }
    
    return constraintsCache;
    
  } catch (error) {
    console.error('Failed to load UI constraints:', error);
    return constraintsCache; // Return cached version on error
  }
}

export async function evaluateUiConstraints(
  scope: 'STACK_PICKER' | 'STRINGING' | 'INVERTER_PICKER',
  context: any
): Promise<{ allowed: boolean; tooltip?: ReactNode; constraint?: UiConstraint }> {
  const constraints = await loadUiConstraints();
  const relevantConstraints = constraints.filter(c => c.scope === scope);
  
  for (const constraint of relevantConstraints) {
    const result = evaluateConstraintExpression(constraint.expression, context);
    
    if (!result.allowed) {
      return {
        allowed: false,
        tooltip: formatConstraintTooltip(constraint, context),
        constraint
      };
    }
  }
  
  return { allowed: true };
}

function evaluateConstraintExpression(expression: any, context: any): { allowed: boolean } {
  if (!expression.when || !expression.if || !expression.elseBlock) {
    return { allowed: true };
  }
  
  // Check if scope matches
  if (expression.when.scope && expression.when.scope !== context.scope) {
    return { allowed: true };
  }
  
  // Evaluate conditions
  const conditionsMet = evaluateConditions(expression.if, context);
  
  return { allowed: conditionsMet };
}

function evaluateConditions(conditions: any, context: any): boolean {
  for (const [key, constraint] of Object.entries(conditions)) {
    const value = getValueFromContext(key, context);
    
    if (typeof constraint === 'object' && constraint !== null) {
      // Handle operators like $gte, $lte, etc.
      for (const [operator, operand] of Object.entries(constraint)) {
        const operandValue = getValueFromContext(operand as string, context);
        
        if (!evaluateOperator(value, operator, operandValue)) {
          return false;
        }
      }
    } else {
      // Direct equality check
      const constraintValue = getValueFromContext(constraint as string, context);
      if (value !== constraintValue) {
        return false;
      }
    }
  }
  
  return true;
}

function evaluateOperator(value: any, operator: string, operand: any): boolean {
  if (value === undefined || value === null) return false;
  
  switch (operator) {
    case '$gte':
      return value >= operand;
    case '$lte':
      return value <= operand;
    case '$gt':
      return value > operand;
    case '$lt':
      return value < operand;
    case '$eq':
      return value === operand;
    case '$ne':
      return value !== operand;
    case '$in':
      return Array.isArray(operand) && operand.includes(value);
    case '$nin':
      return Array.isArray(operand) && !operand.includes(value);
    default:
      return false;
  }
}

function getValueFromContext(key: string, context: any): any {
  if (typeof key !== 'string') return key;
  
  if (key.startsWith('$')) {
    // Handle variable references
    const path = key.substring(1);
    return getNestedValue(context, path);
  }
  
  return getNestedValue(context, key);
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

function formatConstraintTooltip(constraint: UiConstraint, context: any): string {
  if (!constraint.expression.elseBlock?.message) {
    return `Selection blocked by rule: ${constraint.ruleCode}`;
  }
  
  let message = constraint.expression.elseBlock.message;
  
  // Replace placeholders with actual values
  const placeholderRegex = /\{([^}]+)\}/g;
  message = message.replace(placeholderRegex, (match, key) => {
    const value = getValueFromContext(key, context);
    return value !== undefined ? String(value) : match;
  });
  
  return message;
}

// Specific constraint evaluators for common scenarios
export function evaluateStackPickerConstraints(context: {
  panelCount: number;
  panelWattage: number;
  inverterRating: number;
  batteryKwh?: number;
  loadKwh?: number;
}): Promise<{ allowed: boolean; tooltip?: ReactNode; constraint?: UiConstraint }> {
  const calculatedContext = {
    scope: 'STACK_PICKER',
    calc: {
      dc_ac_ratio: (context.panelCount * context.panelWattage) / context.inverterRating,
      backup_headroom: context.batteryKwh && context.loadKwh 
        ? Math.max(0, (context.batteryKwh - context.loadKwh * 0.3) / context.batteryKwh)
        : 1
    },
    inv: {
      rating_kw: context.inverterRating / 1000
    },
    ...context
  };
  
  return evaluateUiConstraints('STACK_PICKER', calculatedContext);
}

export function evaluateStringingConstraints(context: {
  strings: number[];
  panelVmp: number;
  panelVoc: number;
  tempMinC: number;
  inverterMpptMin: number;
  inverterMpptMax: number;
}): Promise<{ allowed: boolean; tooltip?: ReactNode; constraint?: UiConstraint }> {
  const tempCoeff = -0.0032; // Typical temperature coefficient
  
  const stringVoltages = context.strings.map(stringSize => {
    const vmpAtTemp = context.panelVmp * stringSize * (1 + tempCoeff * (context.tempMinC - 25));
    const vocAtTemp = context.panelVoc * stringSize * (1 + tempCoeff * (context.tempMinC - 25));
    
    return {
      min: vmpAtTemp * 0.9,
      max: vocAtTemp * 1.1,
      stringSize
    };
  });
  
  const calculatedContext = {
    scope: 'STRINGING',
    calc: {
      string_v_min: Math.min(...stringVoltages.map(v => v.min)),
      string_v_max: Math.max(...stringVoltages.map(v => v.max)),
      temp_min_c: context.tempMinC
    },
    inv: {
      mppt_min_v: context.inverterMpptMin,
      mppt_max_v: context.inverterMpptMax
    },
    ...context
  };
  
  return evaluateUiConstraints('STRINGING', calculatedContext);
}

export function evaluateInverterPickerConstraints(context: {
  inverterRating: number;
  totalPanelWattage: number;
  phase: '1P' | '3P';
  requiredPhase: '1P' | '3P';
}): Promise<{ allowed: boolean; tooltip?: ReactNode; constraint?: UiConstraint }> {
  const calculatedContext = {
    scope: 'INVERTER_PICKER',
    calc: {
      dc_ac_ratio: context.totalPanelWattage / context.inverterRating,
      phase_match: context.phase === context.requiredPhase
    },
    inv: {
      rating_w: context.inverterRating,
      phase: context.phase
    },
    req: {
      phase: context.requiredPhase
    },
    ...context
  };
  
  return evaluateUiConstraints('INVERTER_PICKER', calculatedContext);
}

// Helper function to refresh constraints cache
export function refreshConstraintsCache(): void {
  constraintsCache = [];
  lastCacheUpdate = 0;
}

// Helper function to check if constraints are loaded
export function areConstraintsLoaded(): boolean {
  return constraintsCache.length > 0 && Date.now() - lastCacheUpdate < CACHE_TTL;
}