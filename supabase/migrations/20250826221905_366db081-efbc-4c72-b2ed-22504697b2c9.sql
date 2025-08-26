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

-- Enable RLS
ALTER TABLE public.proposal_guidelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_standards ENABLE ROW LEVEL SECURITY;

-- Create policies for proposal guidelines
CREATE POLICY "Allow all operations on proposal_guidelines" 
ON public.proposal_guidelines 
FOR ALL 
USING (true);

-- Create policies for training standards
CREATE POLICY "Allow all operations on training_standards" 
ON public.training_standards 
FOR ALL 
USING (true);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_proposal_guidelines_extracted_at ON public.proposal_guidelines(extracted_at);
CREATE INDEX IF NOT EXISTS idx_proposal_guidelines_source ON public.proposal_guidelines(source);
CREATE INDEX IF NOT EXISTS idx_training_standards_type ON public.training_standards(standard_type);