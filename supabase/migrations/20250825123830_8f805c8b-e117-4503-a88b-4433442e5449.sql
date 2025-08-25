-- Add postcode_zones table for zone mapping
CREATE TABLE IF NOT EXISTS public.postcode_zones (
  postcode INTEGER NOT NULL PRIMARY KEY,
  zone INTEGER NOT NULL,
  state TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on postcode_zones
ALTER TABLE public.postcode_zones ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access to postcode zones
CREATE POLICY "Public read access for postcode zones" 
ON public.postcode_zones 
FOR SELECT 
USING (true);

-- Add missing fields to existing tables
ALTER TABLE public.cec_panels 
ADD COLUMN IF NOT EXISTS cec_id TEXT,
ADD COLUMN IF NOT EXISTS technology TEXT;

ALTER TABLE public.cec_batteries 
ADD COLUMN IF NOT EXISTS cec_id TEXT;

ALTER TABLE public.cec_inverters 
ADD COLUMN IF NOT EXISTS cec_id TEXT,
ADD COLUMN IF NOT EXISTS type TEXT;

-- Create refresh_log table to track data updates
CREATE TABLE IF NOT EXISTS public.refresh_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL,
  status TEXT NOT NULL,
  details TEXT,
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on refresh_log
ALTER TABLE public.refresh_log ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access to refresh log
CREATE POLICY "Public read access for refresh log" 
ON public.refresh_log 
FOR SELECT 
USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_postcode_zones_zone ON public.postcode_zones(zone);
CREATE INDEX IF NOT EXISTS idx_cec_panels_cec_id ON public.cec_panels(cec_id);
CREATE INDEX IF NOT EXISTS idx_cec_batteries_cec_id ON public.cec_batteries(cec_id);  
CREATE INDEX IF NOT EXISTS idx_cec_inverters_cec_id ON public.cec_inverters(cec_id);
CREATE INDEX IF NOT EXISTS idx_refresh_log_source ON public.refresh_log(source);
CREATE INDEX IF NOT EXISTS idx_refresh_log_fetched_at ON public.refresh_log(fetched_at DESC);