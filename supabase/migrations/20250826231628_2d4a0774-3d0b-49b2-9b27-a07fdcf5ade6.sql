-- Create orchestrator progress tracking tables
CREATE TABLE public.orchestrator_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'initializing',
  current_phase TEXT,
  total_phases INTEGER NOT NULL DEFAULT 5,
  completed_phases INTEGER NOT NULL DEFAULT 0,
  config JSONB NOT NULL DEFAULT '{}',
  error TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE public.orchestrator_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES orchestrator_sessions(id) ON DELETE CASCADE,
  phase_name TEXT NOT NULL,
  phase_status TEXT NOT NULL DEFAULT 'pending',
  progress_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  details JSONB NOT NULL DEFAULT '{}',
  error TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.orchestrator_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orchestrator_progress ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (no auth required)
CREATE POLICY "Allow all operations on orchestrator_sessions" 
ON public.orchestrator_sessions 
FOR ALL 
USING (true);

CREATE POLICY "Allow all operations on orchestrator_progress" 
ON public.orchestrator_progress 
FOR ALL 
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_orchestrator_sessions_updated_at
BEFORE UPDATE ON public.orchestrator_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();