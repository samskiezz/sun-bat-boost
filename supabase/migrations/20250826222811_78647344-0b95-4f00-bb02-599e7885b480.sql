-- Create table for storing proposal guidelines extracted from PDFs
CREATE TABLE IF NOT EXISTS public.proposal_guidelines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL,
  guidelines JSONB NOT NULL DEFAULT '{}',
  extracted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  content_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for aggregated training standards
CREATE TABLE IF NOT EXISTS public.training_standards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  standard_type TEXT NOT NULL UNIQUE,
  standards JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS if not already enabled
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'proposal_guidelines'
  ) THEN
    ALTER TABLE public.proposal_guidelines ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_proposal_guidelines_extracted_at ON public.proposal_guidelines(extracted_at);
CREATE INDEX IF NOT EXISTS idx_proposal_guidelines_source ON public.proposal_guidelines(source);
CREATE INDEX IF NOT EXISTS idx_training_standards_type ON public.training_standards(standard_type);