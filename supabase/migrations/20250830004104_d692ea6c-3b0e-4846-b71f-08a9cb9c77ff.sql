-- Create tariff_optimizations table
CREATE TABLE public.tariff_optimizations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id text NOT NULL,
  tariff_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  vpp_rules jsonb DEFAULT NULL,
  optimization_params jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tariff_optimizations ENABLE ROW LEVEL SECURITY;

-- Create permissive policies
CREATE POLICY "Allow all operations on tariff_optimizations" 
ON public.tariff_optimizations 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Add updated_at trigger
CREATE TRIGGER update_tariff_optimizations_updated_at
BEFORE UPDATE ON public.tariff_optimizations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_tariff_optimizations_site_id ON public.tariff_optimizations(site_id);
CREATE INDEX idx_tariff_optimizations_created_at ON public.tariff_optimizations(created_at DESC);