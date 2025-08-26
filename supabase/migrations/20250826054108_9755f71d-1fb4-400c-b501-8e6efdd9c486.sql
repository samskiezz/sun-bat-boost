-- Create comprehensive schema for autonomous solar design system

-- Manufacturers table
CREATE TABLE public.manufacturers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  aliases TEXT[] DEFAULT '{}',
  urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Products table with categories
CREATE TYPE product_category AS ENUM ('PANEL', 'INVERTER', 'BATTERY_MODULE', 'BATTERY_STACK');

CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  manufacturer_id UUID NOT NULL REFERENCES public.manufacturers(id),
  category product_category NOT NULL,
  series TEXT,
  model TEXT NOT NULL,
  sku TEXT,
  datasheet_url TEXT,
  product_url TEXT,
  cec_ref TEXT,
  status TEXT,
  pdf_path TEXT,
  pdf_hash TEXT,
  source TEXT, -- "CEC" | "MFR" | "GOOGLE"
  raw JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Specifications table
CREATE TABLE public.specs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  unit TEXT,
  source TEXT, -- "PDF_TEXT" | "PDF_TABLE" | "MFR_PAGE"
  doc_span_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Document spans for explainability
CREATE TABLE public.doc_spans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  page INTEGER NOT NULL,
  bbox JSONB, -- {x,y,w,h}
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Compatibility rules between inverters and batteries
CREATE TABLE public.compat (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inverter_id UUID NOT NULL REFERENCES public.products(id),
  battery_id UUID NOT NULL REFERENCES public.products(id),
  rule_code TEXT NOT NULL,
  ok BOOLEAN NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Training episodes
CREATE TABLE public.train_episodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mode TEXT NOT NULL, -- "OCR" | "DESIGN" | "OCR+DESIGN"
  context JSONB NOT NULL,
  result JSONB NOT NULL,
  reward FLOAT NOT NULL,
  metrics JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Replay buffer for continuous learning
CREATE TABLE public.replay_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kind TEXT NOT NULL, -- "OCR_FAIL" | "FIELD_FIX" | "RULE_SUGGEST" | "DESIGN_FAIL" | "DESIGN_PASS"
  payload JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- System metrics
CREATE TABLE public.metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  value FLOAT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Scrape progress tracking
CREATE TABLE public.scrape_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category product_category NOT NULL,
  total_found INTEGER DEFAULT 0,
  total_processed INTEGER DEFAULT 0,
  total_with_pdfs INTEGER DEFAULT 0,
  total_parsed INTEGER DEFAULT 0,
  last_cursor TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.manufacturers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doc_spans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.train_episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.replay_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scrape_progress ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for now)
CREATE POLICY "Allow all operations on manufacturers" ON public.manufacturers FOR ALL USING (true);
CREATE POLICY "Allow all operations on products" ON public.products FOR ALL USING (true);
CREATE POLICY "Allow all operations on specs" ON public.specs FOR ALL USING (true);
CREATE POLICY "Allow all operations on doc_spans" ON public.doc_spans FOR ALL USING (true);
CREATE POLICY "Allow all operations on compat" ON public.compat FOR ALL USING (true);
CREATE POLICY "Allow all operations on train_episodes" ON public.train_episodes FOR ALL USING (true);
CREATE POLICY "Allow all operations on replay_items" ON public.replay_items FOR ALL USING (true);
CREATE POLICY "Allow all operations on metrics" ON public.metrics FOR ALL USING (true);
CREATE POLICY "Allow all operations on scrape_progress" ON public.scrape_progress FOR ALL USING (true);

-- Create indexes for performance
CREATE INDEX idx_products_category ON public.products (category);
CREATE INDEX idx_products_manufacturer ON public.products (manufacturer_id);
CREATE INDEX idx_specs_product_key ON public.specs (product_id, key);
CREATE INDEX idx_doc_spans_product_key ON public.doc_spans (product_id, key);
CREATE INDEX idx_compat_inverter_battery ON public.compat (inverter_id, battery_id);
CREATE INDEX idx_train_episodes_mode_created ON public.train_episodes (mode, created_at DESC);
CREATE INDEX idx_replay_items_kind_processed ON public.replay_items (kind, processed);
CREATE INDEX idx_metrics_name_created ON public.metrics (name, created_at DESC);

-- Create updated_at triggers
CREATE TRIGGER update_manufacturers_updated_at
  BEFORE UPDATE ON public.manufacturers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scrape_progress_updated_at
  BEFORE UPDATE ON public.scrape_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();