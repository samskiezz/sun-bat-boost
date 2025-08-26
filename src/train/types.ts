export interface SiteContext {
  phase: '1P' | '3P';
  tempMinC: number;
  roofTilt: number;
  roofAzimuth: number;
  loadDayKwh: number;
  loadNightKwh: number;
  exportRule: 'UNLIMITED' | 'LIMITED' | 'ZERO';
  postcode: string;
  state: string;
}

export interface ProductBasket {
  panelId?: string;
  inverterId?: string;
  moduleId?: string;
  qty: number;
}

export interface DesignResult {
  valid: {
    choice: any;
    dcAc: number;
    backupH: number;
    hasCitations: boolean;
    stackVsWindow: { center: number; span: number };
  }[];
  invalid: Array<{
    choice: any;
    ruleCode: string;
    details: any;
    guardCandidate?: any;
  }>;
}

export interface TrainingMetrics {
  accuracy: number;
  coverage: number;
  ruleViolations: number;
  roiProxy: number;
}

export interface DocSpan {
  id: string;
  productId: string;
  key: string;
  page: number;
  bbox?: { x: number; y: number; w: number; h: number };
  text: string;
}

export interface UiConstraint {
  id: string;
  scope: 'STACK_PICKER' | 'STRINGING' | 'INVERTER_PICKER';
  ruleCode: string;
  expression: any; // JSON constraint expression
  reason: {
    productId: string;
    key: string;
    expected: any;
    actual: any;
    docSpanId?: string;
  };
  enabled: boolean;
  confidence: number;
}

export interface TrainEpisode {
  id: string;
  mode: 'OCR' | 'DESIGN';
  context: any;
  result: any;
  reward: number;
  metrics: TrainingMetrics;
}

export interface ReplayItem {
  id: string;
  kind: 'OCR_FAIL' | 'OCR_FIX' | 'RULE_SUGGEST' | 'DESIGN_PASS' | 'DESIGN_FAIL';
  payload: any;
  processed: boolean;
}

export type NoiseLevel = 'low' | 'medium' | 'high';

export interface OCRDeltas {
  correct: number;
  incorrect: number;
  missed: number;
  docSpansCaptured: boolean;
}