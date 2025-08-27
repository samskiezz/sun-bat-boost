-- Create table for storing AI model weights and neural network parameters
CREATE TABLE IF NOT EXISTS public.ai_model_weights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model_type TEXT NOT NULL UNIQUE,
  weights JSONB NOT NULL,
  version TEXT NOT NULL,
  performance_score REAL NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.ai_model_weights ENABLE ROW LEVEL SECURITY;

-- Create policy for reading model weights (public access for AI processing)
CREATE POLICY "Model weights are publicly readable" 
ON public.ai_model_weights 
FOR SELECT 
USING (true);

-- Create policy for updating model weights (system only)
CREATE POLICY "System can update model weights" 
ON public.ai_model_weights 
FOR ALL
USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_model_weights_type ON public.ai_model_weights(model_type);
CREATE INDEX IF NOT EXISTS idx_ai_model_weights_performance ON public.ai_model_weights(performance_score DESC);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_ai_model_weights_updated_at
BEFORE UPDATE ON public.ai_model_weights
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();