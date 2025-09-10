-- Fix critical security vulnerability in compliance_checks table
-- Remove overly permissive RLS policy that exposes customer data

-- Drop the current overly permissive policy
DROP POLICY IF EXISTS "Allow all operations on compliance_checks" ON public.compliance_checks;

-- Create secure policies that only allow service role access
-- This protects customer site information, system designs, and compliance evidence

CREATE POLICY "Service role can manage compliance checks" 
ON public.compliance_checks 
FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');

-- Allow authenticated users to only view their own compliance checks if user_id is added later
-- For now, we'll create a policy structure ready for proper user authentication
CREATE POLICY "Users can view own compliance checks" 
ON public.compliance_checks 
FOR SELECT 
USING (false); -- Disabled until proper user authentication is implemented

-- Add comment explaining the security consideration
COMMENT ON TABLE public.compliance_checks IS 'Contains sensitive customer site information and system designs. Access restricted to service role only.';

-- Create audit log for compliance check access (for security monitoring)
CREATE TABLE IF NOT EXISTS public.compliance_access_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid,
    compliance_check_id uuid REFERENCES public.compliance_checks(id),
    action text NOT NULL,
    accessed_at timestamp with time zone DEFAULT now(),
    ip_address inet,
    user_agent text
);

-- Enable RLS on audit log table
ALTER TABLE public.compliance_access_logs ENABLE ROW LEVEL SECURITY;

-- Only service role can manage audit logs
CREATE POLICY "Service role can manage compliance audit logs" 
ON public.compliance_access_logs 
FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');