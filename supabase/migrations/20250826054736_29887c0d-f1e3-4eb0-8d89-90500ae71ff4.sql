-- Add missing tables and columns for comprehensive autonomous solar design system

-- Create product category enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE product_category AS ENUM ('PANEL', 'INVERTER', 'BATTERY_MODULE', 'BATTERY_STACK');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create manufacturers table
CREATE TABLE IF NOT EXISTS public.manufacturers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  aliases TEXT[] DEFAULT '{}',
  urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create comprehensive products table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  manufacturer_id UUID REFERENCES public.manufacturers(id),
  category product_category,
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

-- Add missing columns to existing products table if needed
DO $$ BEGIN
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS manufacturer_id UUID REFERENCES public.manufacturers(id);
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category product_category;
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS series TEXT;
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sku TEXT;
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS datasheet_url TEXT;
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS product_url TEXT;
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cec_ref TEXT;
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS status TEXT;
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS pdf_path TEXT;
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS pdf_hash TEXT;
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS source TEXT;
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS raw JSONB DEFAULT '{}';
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Create specs table
CREATE TABLE IF NOT EXISTS public.specs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  unit TEXT,
  source TEXT, -- "PDF_TEXT" | "PDF_TABLE" | "MFR_PAGE"
  doc_span_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key constraint to specs if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.specs ADD CONSTRAINT specs_product_id_fkey 
    FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create compatibility table
CREATE TABLE IF NOT EXISTS public.compat (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inverter_id UUID NOT NULL,
  battery_id UUID NOT NULL,
  rule_code TEXT NOT NULL,
  ok BOOLEAN NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key constraints to compat table
DO $$ BEGIN
    ALTER TABLE public.compat ADD CONSTRAINT compat_inverter_id_fkey 
    FOREIGN KEY (inverter_id) REFERENCES public.products(id);
    ALTER TABLE public.compat ADD CONSTRAINT compat_battery_id_fkey 
    FOREIGN KEY (battery_id) REFERENCES public.products(id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create scrape progress tracking table
CREATE TABLE IF NOT EXISTS public.scrape_progress (
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

-- Create readiness gates table
CREATE TABLE IF NOT EXISTS public.readiness_gates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gate_name TEXT NOT NULL UNIQUE,
  required_value FLOAT NOT NULL,
  current_value FLOAT DEFAULT 0,
  passing BOOLEAN DEFAULT false,
  last_checked TIMESTAMP WITH TIME ZONE DEFAULT now(),
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default readiness gates
INSERT INTO public.readiness_gates (gate_name, required_value, details) VALUES 
('panels_coverage', 1348, '{"description": "Minimum number of panels with specs"}'),
('batteries_coverage', 513, '{"description": "Minimum number of battery modules with specs"}'),
('training_episodes', 50000, '{"description": "Minimum training episodes completed"}'),
('ocr_precision', 0.85, '{"description": "OCR brand/model precision threshold"}'),
('ocr_recall', 0.85, '{"description": "OCR brand/model recall threshold"}'),
('guard_coverage', 0.95, '{"description": "Percentage of invalid combos blocked"}'),
('explainability', 0.90, '{"description": "Percentage of blocks with DocSpan references"}')
ON CONFLICT (gate_name) DO NOTHING;

-- Enable RLS on new tables
ALTER TABLE public.manufacturers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scrape_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.readiness_gates ENABLE ROW LEVEL SECURITY;

-- Create policies for new tables
DO $$ BEGIN
    CREATE POLICY "Allow all operations on manufacturers" ON public.manufacturers FOR ALL USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Allow all operations on products" ON public.products FOR ALL USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Allow all operations on specs" ON public.specs FOR ALL USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Allow all operations on compat" ON public.compat FOR ALL USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Allow all operations on scrape_progress" ON public.scrape_progress FOR ALL USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Allow all operations on readiness_gates" ON public.readiness_gates FOR ALL USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products (category);
CREATE INDEX IF NOT EXISTS idx_products_manufacturer ON public.products (manufacturer_id);
CREATE INDEX IF NOT EXISTS idx_specs_product_key ON public.specs (product_id, key);
CREATE INDEX IF NOT EXISTS idx_compat_inverter_battery ON public.compat (inverter_id, battery_id);

-- Create triggers for updated_at
DO $$ BEGIN
    CREATE TRIGGER update_manufacturers_updated_at
      BEFORE UPDATE ON public.manufacturers
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_products_updated_at
      BEFORE UPDATE ON public.products
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_scrape_progress_updated_at
      BEFORE UPDATE ON public.scrape_progress
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_readiness_gates_updated_at
      BEFORE UPDATE ON public.readiness_gates
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;