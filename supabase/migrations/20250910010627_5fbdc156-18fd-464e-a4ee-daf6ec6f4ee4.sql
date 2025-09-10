-- Fix critical security vulnerability in compliance_checks table
-- First, drop ALL existing policies to ensure clean state

DROP POLICY IF EXISTS "Allow all operations on compliance_checks" ON public.compliance_checks;
DROP POLICY IF EXISTS "Service role can manage compliance checks" ON public.compliance_checks;
DROP POLICY IF EXISTS "Users can view own compliance checks" ON public.compliance_checks;

-- Create secure policy that restricts access to service role only
-- This protects customer site information, system designs, and compliance evidence
CREATE POLICY "Restrict compliance checks to service role only" 
ON public.compliance_checks 
FOR ALL 
TO service_role
USING (true);

-- Create a read-only policy for authenticated system functions (if needed)
-- This is disabled by default for maximum security
CREATE POLICY "System functions read access" 
ON public.compliance_checks 
FOR SELECT 
TO authenticated
USING (false); -- Disabled - change to appropriate condition when authentication is implemented

-- Add security documentation
COMMENT ON TABLE public.compliance_checks IS 'SECURITY CRITICAL: Contains sensitive customer site information, system designs, and compliance evidence. Access restricted to service role only to prevent competitor access.';

-- Create audit logging for compliance check access (if table doesn't exist)
CREATE TABLE IF NOT EXISTS public.compliance_access_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text,
    compliance_check_id uuid REFERENCES public.compliance_checks(id),
    action text NOT NULL,
    accessed_at timestamp with time zone DEFAULT now(),
    ip_address inet,
    user_agent text,
    success boolean DEFAULT true
);

-- Enable RLS on audit log table
ALTER TABLE public.compliance_access_logs ENABLE ROW LEVEL SECURITY;

-- Secure audit logs - only service role access
CREATE POLICY "Audit logs service role only" 
ON public.compliance_access_logs 
FOR ALL 
TO service_role
USING (true);