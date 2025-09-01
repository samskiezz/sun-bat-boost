-- Create links table for persisting data polygon relationships
CREATE TABLE IF NOT EXISTS public.links(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_a TEXT NOT NULL,
  source_b TEXT NOT NULL,
  score DOUBLE PRECISION NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.links ENABLE ROW LEVEL SECURITY;

-- Create policy for public access
CREATE POLICY "Links are publicly accessible" 
ON public.links 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS links_pair_idx ON public.links(source_a, source_b);