-- Drop existing problematic tables and create new proper schema
DROP TABLE IF EXISTS public.cec_panels CASCADE;
DROP TABLE IF EXISTS public.cec_batteries CASCADE; 
DROP TABLE IF EXISTS public.cec_inverters CASCADE;
DROP TABLE IF EXISTS public.cec_data_refresh_log CASCADE;
DROP TABLE IF EXISTS public.refresh_log CASCADE;
DROP TABLE IF EXISTS public.battery_vpp_compatibility CASCADE;

-- PV modules with proper constraints
CREATE TABLE IF NOT EXISTS public.pv_modules (
  id bigserial primary key,
  brand text not null,
  model text not null,
  technology text,
  certificate text,
  approval_status text,
  approval_expires date,
  datasheet_url text,
  source_url text not null,
  hash text,
  scraped_at timestamptz not null default now(),
  UNIQUE (brand, model)
);

-- Batteries (ESD/BESS) with proper constraints
CREATE TABLE IF NOT EXISTS public.batteries (
  id bigserial primary key,
  brand text not null,
  model text not null,
  chemistry text,
  certificate text,
  approval_status text,
  approval_expires date,
  datasheet_url text,
  source_url text not null,
  hash text,
  scraped_at timestamptz not null default now(),
  UNIQUE (brand, model)
);

-- Audit table for tracking changes
CREATE TABLE IF NOT EXISTS public.product_changes (
  id bigserial primary key,
  product_type text not null check (product_type in ('pv','battery')),
  brand text not null,
  model text not null,
  old_hash text,
  new_hash text,
  changed_at timestamptz not null default now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pv_brand_model ON public.pv_modules (brand, model);
CREATE INDEX IF NOT EXISTS idx_bat_brand_model ON public.batteries (brand, model);
CREATE INDEX IF NOT EXISTS idx_pv_expires ON public.pv_modules (approval_expires);
CREATE INDEX IF NOT EXISTS idx_bat_expires ON public.batteries (approval_expires);
CREATE INDEX IF NOT EXISTS idx_pv_scraped ON public.pv_modules (scraped_at);
CREATE INDEX IF NOT EXISTS idx_bat_scraped ON public.batteries (scraped_at);

-- Enable RLS (allow reads, block writes for anon)
ALTER TABLE public.pv_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batteries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_changes ENABLE ROW LEVEL SECURITY;

-- Create read-only policies for anonymous users
CREATE POLICY "ro_select_pv" ON public.pv_modules
  FOR SELECT USING (true);

CREATE POLICY "ro_select_bat" ON public.batteries
  FOR SELECT USING (true);

CREATE POLICY "ro_select_changes" ON public.product_changes
  FOR SELECT USING (true);

-- Keep the postcode zones table as it's still needed
-- No insert/update/delete policies for anon - Edge Function uses service key