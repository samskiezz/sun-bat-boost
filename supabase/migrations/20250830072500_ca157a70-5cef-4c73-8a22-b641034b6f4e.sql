-- Create PV twins table for TwinUncertaintyTab
CREATE TABLE public.pv_twins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_name TEXT NOT NULL,
  location TEXT NOT NULL,
  system_kw NUMERIC NOT NULL DEFAULT 0,
  tilt_degrees NUMERIC NOT NULL DEFAULT 30,
  orientation_degrees NUMERIC NOT NULL DEFAULT 0,
  physics_params JSONB NOT NULL DEFAULT '{
    "soiling": 0.02,
    "albedo": 0.2,
    "bifacial_gain": 0.1
  }'::jsonb,
  simulation_results JSONB DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pv_twins ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (no auth required for demo)
CREATE POLICY "PV twins are publicly accessible" 
ON public.pv_twins 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_pv_twins_updated_at
BEFORE UPDATE ON public.pv_twins
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();