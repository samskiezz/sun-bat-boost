-- Create health monitoring table for system status tracking
CREATE TABLE IF NOT EXISTS public.system_health (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'warning', 'error')),
  message TEXT,
  response_time_ms INTEGER,
  last_checked TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_health ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access for system health
CREATE POLICY "Allow public read access to system health" 
ON public.system_health 
FOR SELECT 
USING (true);

-- Create policy to allow service role to insert/update health data
CREATE POLICY "Allow service role to manage health data" 
ON public.system_health 
FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_system_health_service_time ON public.system_health(service_name, last_checked DESC);