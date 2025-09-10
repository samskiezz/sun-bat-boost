-- Fix critical AI training configurations security vulnerability
-- Remove public access to proprietary ML training methodologies

-- Drop existing overly permissive policies on training_sessions
DROP POLICY IF EXISTS "Allow all operations on training_sessions" ON public.training_sessions;

-- Create secure policy - only service role can access training configurations
-- This protects proprietary ML training methodologies from competitor theft
CREATE POLICY "Training sessions service role access only" 
ON public.training_sessions 
FOR ALL 
TO service_role
USING (true);

-- Create restricted read policy for authenticated ML team (disabled by default)
CREATE POLICY "ML team read access to training sessions" 
ON public.training_sessions 
FOR SELECT 
TO authenticated
USING (false); -- Disabled - enable only with proper ML team authentication

-- Add security documentation
COMMENT ON TABLE public.training_sessions IS 'SECURITY CRITICAL: Contains proprietary AI training configurations, hyperparameters, and methodologies. Public access removed to prevent competitors from replicating training approaches. Access restricted to service role only.';

-- Secure related training tables as well
-- Fix training_metrics table
DROP POLICY IF EXISTS "Allow all operations on training_metrics" ON public.training_metrics;

CREATE POLICY "Training metrics service role access only" 
ON public.training_metrics 
FOR ALL 
TO service_role
USING (true);

COMMENT ON TABLE public.training_metrics IS 'SECURITY CRITICAL: Contains proprietary training performance metrics that reveal ML methodology effectiveness.';

-- Fix train_episodes table  
DROP POLICY IF EXISTS "Allow all operations on train_episodes" ON public.train_episodes;

CREATE POLICY "Train episodes service role access only" 
ON public.train_episodes 
FOR ALL 
TO service_role
USING (true);

COMMENT ON TABLE public.train_episodes IS 'SECURITY CRITICAL: Contains detailed training episode data that could reveal proprietary reinforcement learning strategies.';

-- Create audit logging for training data access
CREATE TABLE IF NOT EXISTS public.training_access_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text,
    table_accessed text NOT NULL,
    session_id uuid,
    action text NOT NULL,
    accessed_at timestamp with time zone DEFAULT now(),
    ip_address inet,
    user_agent text,
    success boolean DEFAULT true,
    security_context jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS on training audit logs
ALTER TABLE public.training_access_logs ENABLE ROW LEVEL SECURITY;

-- Secure audit logs - service role only
CREATE POLICY "Training audit logs service role only" 
ON public.training_access_logs 
FOR ALL 
TO service_role
USING (true);

-- Add column comments for security awareness
COMMENT ON COLUMN public.training_sessions.config IS 'PROPRIETARY: Training hyperparameters and configurations - contains competitive ML methodology';
COMMENT ON COLUMN public.training_sessions.current_stage IS 'CONFIDENTIAL: Training pipeline stages - reveals proprietary ML workflow';
COMMENT ON COLUMN public.train_episodes.context IS 'PROPRIETARY: Training episode context data - contains RL strategy details';
COMMENT ON COLUMN public.train_episodes.result IS 'CONFIDENTIAL: Training results that reveal model performance patterns';