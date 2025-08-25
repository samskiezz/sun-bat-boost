-- Create data update tracking table
CREATE TABLE IF NOT EXISTS public.data_update_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL UNIQUE,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  record_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.data_update_tracking ENABLE ROW LEVEL SECURITY;

-- Create policy for read access
CREATE POLICY "Public read access for data tracking" 
ON public.data_update_tracking 
FOR SELECT 
USING (true);

-- Insert initial tracking records
INSERT INTO public.data_update_tracking (table_name, record_count, status) 
VALUES 
  ('pv_modules', 0, 'needs_update'),
  ('batteries', 0, 'needs_update')
ON CONFLICT (table_name) DO NOTHING;

-- Create function to check if data needs update (older than 7 days)
CREATE OR REPLACE FUNCTION public.check_data_freshness(table_name_param TEXT)
RETURNS BOOLEAN 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  last_update TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT last_updated INTO last_update 
  FROM public.data_update_tracking 
  WHERE table_name = table_name_param;
  
  -- If no record found or older than 7 days, needs update
  RETURN (last_update IS NULL OR last_update < NOW() - INTERVAL '7 days');
END;
$$;

-- Create function to update tracking record
CREATE OR REPLACE FUNCTION public.update_data_tracking(
  table_name_param TEXT,
  count_param INTEGER,
  status_param TEXT DEFAULT 'completed',
  notes_param TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.data_update_tracking (table_name, record_count, status, notes, last_updated)
  VALUES (table_name_param, count_param, status_param, notes_param, NOW())
  ON CONFLICT (table_name) 
  DO UPDATE SET 
    record_count = count_param,
    status = status_param,
    notes = notes_param,
    last_updated = NOW();
END;
$$;