import { z } from 'zod';

export type Unit = 'W' | 'kW' | 'Wh' | 'kWh';
export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW';
export type ContextType = 'TABLE' | 'LINE' | 'HEADER' | 'FOOTER' | 'NOTE';

export const EvidenceSchema = z.object({
  page: z.number(),
  text: z.string(),
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional(),
  context: z.enum(['TABLE', 'LINE', 'HEADER', 'FOOTER', 'NOTE']),
  weight: z.number().min(1).max(5),
});

export type Evidence = z.infer<typeof EvidenceSchema>;

export const PanelCandidateSchema = z.object({
  brand: z.string().optional(),
  model: z.string().optional(),
  count: z.number().optional(),
  wattage: z.number().optional(),
  arrayKwDc: z.number().optional(),
  evidences: z.array(EvidenceSchema),
  score: z.number().default(0),
  syntheticProduct: z.union([z.boolean(), z.any()]).optional(),
});

export type PanelCandidate = z.infer<typeof PanelCandidateSchema>;

export const BatteryCandidateSchema = z.object({
  brand: z.string().optional(),
  model: z.string().optional(),
  usableKWh: z.number().optional(),
  stack: z.object({
    modules: z.number().optional(),
    moduleKWh: z.number().optional(),
    totalKWh: z.number().optional(),
  }).optional(),
  evidences: z.array(EvidenceSchema),
  score: z.number().default(0),
  syntheticProduct: z.union([z.boolean(), z.any()]).optional(),
});

export type BatteryCandidate = z.infer<typeof BatteryCandidateSchema>;

export const InverterExtractSchema = z.object({
  brandRaw: z.string().optional(),
  modelRaw: z.string().optional(),
  phases: z.enum(['SINGLE', 'THREE']).optional(),
  ratedKw: z.number().optional(),
  evidences: z.array(EvidenceSchema),
});

export type InverterExtract = z.infer<typeof InverterExtractSchema>;

export const ExtractResultSchema = z.object({
  panels: z.object({
    best: PanelCandidateSchema.optional(),
    candidates: z.array(PanelCandidateSchema),
    confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']),
    warnings: z.array(z.string()),
  }),
  battery: z.object({
    best: BatteryCandidateSchema.optional(),
    candidates: z.array(BatteryCandidateSchema),
    confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']),
    warnings: z.array(z.string()),
  }),
  inverter: z.object({
    value: InverterExtractSchema.optional(),
    confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']),
    warnings: z.array(z.string()),
  }),
  policyCalcInput: z.object({
    address: z.string().optional(),
    postcode: z.string().optional(),
    zoneHint: z.string().optional(),
    installDateISO: z.string().optional(),
  }),
  errors: z.array(z.string()),
});

export type ExtractResult = z.infer<typeof ExtractResultSchema>;

export interface OCRPage {
  page: number;
  text: string;
}