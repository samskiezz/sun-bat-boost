-- Create tables for multi-task training system
CREATE TABLE IF NOT EXISTS public.training_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'initialized',
  current_stage TEXT,
  error TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS public.training_stage_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL,
  stage_index INTEGER NOT NULL,
  results JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.npu_builds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  build_id UUID NOT NULL UNIQUE,
  models JSONB NOT NULL DEFAULT '[]',
  build_config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.model_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_name TEXT NOT NULL UNIQUE,
  config_type TEXT NOT NULL,
  config_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dataset_splits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dataset_name TEXT NOT NULL,
  split_type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_stage_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.npu_builds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dataset_splits ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all operations on training_sessions" ON public.training_sessions FOR ALL USING (true);
CREATE POLICY "Allow all operations on training_stage_results" ON public.training_stage_results FOR ALL USING (true);
CREATE POLICY "Allow all operations on npu_builds" ON public.npu_builds FOR ALL USING (true);
CREATE POLICY "Allow all operations on model_configs" ON public.model_configs FOR ALL USING (true);
CREATE POLICY "Allow all operations on dataset_splits" ON public.dataset_splits FOR ALL USING (true);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_training_sessions_status ON public.training_sessions(status);
CREATE INDEX IF NOT EXISTS idx_stage_results_session ON public.training_stage_results(session_id);
CREATE INDEX IF NOT EXISTS idx_npu_builds_created ON public.npu_builds(created_at);
CREATE INDEX IF NOT EXISTS idx_model_configs_type ON public.model_configs(config_type);