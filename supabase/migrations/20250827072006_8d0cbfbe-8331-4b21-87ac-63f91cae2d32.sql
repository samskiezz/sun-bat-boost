CREATE TABLE IF NOT EXISTS public.dnsps (
  id SERIAL PRIMARY KEY,
  state TEXT NOT NULL,
  postcode_start INTEGER NOT NULL,
  postcode_end INTEGER NOT NULL,
  network TEXT NOT NULL,
  export_cap_kw DOUBLE PRECISION DEFAULT 5.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dnsps_postcode_range ON public.dnsps(postcode_start, postcode_end);
CREATE INDEX IF NOT EXISTS idx_dnsps_state ON public.dnsps(state);

-- Enable RLS
ALTER TABLE public.dnsps ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Public read access for DNSP data" 
ON public.dnsps 
FOR SELECT 
USING (true);