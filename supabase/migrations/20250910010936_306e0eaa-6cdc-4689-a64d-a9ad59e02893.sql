-- Fix critical AI model weights security vulnerability
-- Remove public read access that exposes proprietary ML models

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Model weights are publicly readable" ON public.ai_model_weights;
DROP POLICY IF EXISTS "System can update model weights" ON public.ai_model_weights;

-- Create secure policy - only service role can access AI model weights
-- This protects proprietary machine learning models from competitor theft
CREATE POLICY "AI models service role access only" 
ON public.ai_model_weights 
FOR ALL 
TO service_role
USING (true);

-- Create restricted read policy for authenticated system functions (disabled by default)
CREATE POLICY "System ML functions read access" 
ON public.ai_model_weights 
FOR SELECT 
TO authenticated
USING (false); -- Disabled - only enable with proper user authentication and authorization

-- Add security documentation
COMMENT ON TABLE public.ai_model_weights IS 'SECURITY CRITICAL: Contains proprietary AI model weights and performance metrics. Public access removed to prevent model theft by competitors. Access restricted to service role only.';

-- Create audit logging for AI model access
CREATE TABLE IF NOT EXISTS public.ai_model_access_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text,
    model_type text,
    model_version text,
    action text NOT NULL,
    accessed_at timestamp with time zone DEFAULT now(),
    ip_address inet,
    user_agent text,
    success boolean DEFAULT true,
    security_context jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS on AI model audit logs
ALTER TABLE public.ai_model_access_logs ENABLE ROW LEVEL SECURITY;

-- Secure audit logs - service role only
CREATE POLICY "AI model audit logs service role only" 
ON public.ai_model_access_logs 
FOR ALL 
TO service_role
USING (true);

-- Add column comment for security awareness
COMMENT ON COLUMN public.ai_model_weights.weights IS 'PROPRIETARY: AI model weights - contains competitive advantage data';
COMMENT ON COLUMN public.ai_model_weights.performance_score IS 'CONFIDENTIAL: Model performance metrics - business sensitive data';