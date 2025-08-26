-- Add missing tables for comprehensive solar design system (avoiding duplicates)

-- Manufacturers table
CREATE TABLE IF NOT EXISTS public.manufacturers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  aliases TEXT[] DEFAULT '{}',
  urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Products table with categories (extend existing if needed)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_category') THEN
    CREATE TYPE product_category AS ENUM ('PANEL', 'INVERTER', 'BATTERY_MODULE', 'BATTERY_STACK');
  END IF;
END $$;

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

-- Specifications table
CREATE TABLE IF NOT EXISTS public.specs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  unit TEXT,
  source TEXT, -- "PDF_TEXT" | "PDF_TABLE" | "MFR_PAGE"
  doc_span_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Compatibility rules between inverters and batteries
CREATE TABLE IF NOT EXISTS public.compat (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inverter_id UUID NOT NULL REFERENCES public.products(id),
  battery_id UUID NOT NULL REFERENCES public.products(id),
  rule_code TEXT NOT NULL,
  ok BOOLEAN NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Scrape progress tracking
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

-- Enable RLS on new tables
ALTER TABLE public.manufacturers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scrape_progress ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for system functionality)
DROP POLICY IF EXISTS "Allow all operations on manufacturers" ON public.manufacturers;
CREATE POLICY "Allow all operations on manufacturers" ON public.manufacturers FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all operations on products" ON public.products;
CREATE POLICY "Allow all operations on products" ON public.products FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all operations on specs" ON public.specs;
CREATE POLICY "Allow all operations on specs" ON public.specs FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all operations on compat" ON public.compat;
CREATE POLICY "Allow all operations on compat" ON public.compat FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all operations on scrape_progress" ON public.scrape_progress;
CREATE POLICY "Allow all operations on scrape_progress" ON public.scrape_progress FOR ALL USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products (category);
CREATE INDEX IF NOT EXISTS idx_products_manufacturer ON public.products (manufacturer_id);
CREATE INDEX IF NOT EXISTS idx_specs_product_key ON public.specs (product_id, key);
CREATE INDEX IF NOT EXISTS idx_compat_inverter_battery ON public.compat (inverter_id, battery_id);

-- Create updated_at triggers
DROP TRIGGER IF EXISTS update_manufacturers_updated_at ON public.manufacturers;
CREATE TRIGGER update_manufacturers_updated_at
  BEFORE UPDATE ON public.manufacturers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_scrape_progress_updated_at ON public.scrape_progress;
CREATE TRIGGER update_scrape_progress_updated_at
  BEFORE UPDATE ON public.scrape_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();