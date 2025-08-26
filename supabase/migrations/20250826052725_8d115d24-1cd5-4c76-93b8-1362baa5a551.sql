-- Create tables for autonomous background trainer system

-- Document spans for spec-sheet references
CREATE TABLE public.doc_spans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id TEXT NOT NULL,
  key TEXT NOT NULL, -- e.g. "inv.vbat_min_v"
  page INTEGER NOT NULL,
  bbox JSONB, -- {x,y,w,h} if available
  text TEXT NOT NULL, -- source line/snippet
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- UI constraints that block invalid choices
CREATE TABLE public.ui_constraints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scope TEXT NOT NULL, -- "STACK_PICKER" | "STRINGING" | "INVERTER_PICKER"
  rule_code TEXT NOT NULL, -- "BAT_VOLT_RANGE" | "MPPT_WINDOW" | ...
  expression JSONB NOT NULL, -- normalized constraint
  reason JSONB NOT NULL, -- {productId,key,expected,actual,docSpanId?}
  enabled BOOLEAN NOT NULL DEFAULT true,
  confidence FLOAT NOT NULL DEFAULT 0.0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Training episodes
CREATE TABLE public.train_episodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mode TEXT NOT NULL, -- "OCR" | "DESIGN"
  context JSONB NOT NULL, -- site, products chosen, noise seed, etc.
  result JSONB NOT NULL, -- parsed entities or design picks
  reward FLOAT NOT NULL,
  metrics JSONB NOT NULL, -- accuracy, coverage, rule violations, ROI proxy
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Replay buffer for continuous learning
CREATE TABLE public.replay_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kind TEXT NOT NULL, -- "OCR_FAIL" | "OCR_FIX" | "RULE_SUGGEST" | "DESIGN_PASS" | "DESIGN_FAIL"
  payload JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Training metrics and performance tracking
CREATE TABLE public.training_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_type TEXT NOT NULL, -- "OCR_ACCURACY" | "RULE_COVERAGE" | "DESIGN_SUCCESS"
  value FLOAT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all training tables
ALTER TABLE public.doc_spans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ui_constraints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.train_episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.replay_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies for training system (allow all operations for now)
CREATE POLICY "Allow all operations on doc_spans" ON public.doc_spans FOR ALL USING (true);
CREATE POLICY "Allow all operations on ui_constraints" ON public.ui_constraints FOR ALL USING (true);
CREATE POLICY "Allow all operations on train_episodes" ON public.train_episodes FOR ALL USING (true);
CREATE POLICY "Allow all operations on replay_items" ON public.replay_items FOR ALL USING (true);
CREATE POLICY "Allow all operations on training_metrics" ON public.training_metrics FOR ALL USING (true);

-- Create indexes for performance
CREATE INDEX idx_doc_spans_product_key ON public.doc_spans (product_id, key);
CREATE INDEX idx_ui_constraints_scope ON public.ui_constraints (scope, enabled);
CREATE INDEX idx_train_episodes_mode_created ON public.train_episodes (mode, created_at DESC);
CREATE INDEX idx_replay_items_kind_processed ON public.replay_items (kind, processed);
CREATE INDEX idx_training_metrics_type_created ON public.training_metrics (metric_type, created_at DESC);

-- Create trigger for updating updated_at
CREATE TRIGGER update_ui_constraints_updated_at
  BEFORE UPDATE ON public.ui_constraints
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();