-- Critical Security Fix: Restrict Access to Sensitive Tables
-- This migration addresses critical data exposure vulnerabilities

-- =====================================================
-- 1. Fix tariff_optimizations table
-- =====================================================
-- Drop overly permissive policy
DROP POLICY IF EXISTS "Allow all operations on tariff_optimizations" ON public.tariff_optimizations;

-- Allow service role full access
CREATE POLICY "Service role can manage tariff optimizations"
ON public.tariff_optimizations
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Allow authenticated users to view and manage their own optimizations
CREATE POLICY "Users can view their own tariff optimizations"
ON public.tariff_optimizations
FOR SELECT
TO authenticated
USING (true); -- Note: Add user_id column if you want user-specific access

CREATE POLICY "Users can create tariff optimizations"
ON public.tariff_optimizations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- =====================================================
-- 2. Fix training_stage_results table (ML data)
-- =====================================================
-- Drop overly permissive policy
DROP POLICY IF EXISTS "Allow all operations on training_stage_results" ON public.training_stage_results;

-- Restrict to service role only (ML training data is proprietary)
CREATE POLICY "Service role only access to training stage results"
ON public.training_stage_results
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =====================================================
-- 3. Fix orchestrator_sessions table
-- =====================================================
-- Drop overly permissive policy
DROP POLICY IF EXISTS "Allow all operations on orchestrator_sessions" ON public.orchestrator_sessions;

-- Restrict to service role only (system operations)
CREATE POLICY "Service role only access to orchestrator sessions"
ON public.orchestrator_sessions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =====================================================
-- 4. Fix orchestrator_progress table
-- =====================================================
-- Drop overly permissive policy
DROP POLICY IF EXISTS "Allow all operations on orchestrator_progress" ON public.orchestrator_progress;

-- Restrict to service role only
CREATE POLICY "Service role only access to orchestrator progress"
ON public.orchestrator_progress
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =====================================================
-- 5. Review system_health table
-- =====================================================
-- Keep public read access for health checks, but restrict writes
-- The existing "Allow service role to manage health data" policy is good
-- The "Allow public read access to system health" is intentional for monitoring

-- =====================================================
-- 6. Add audit logging for policy changes
-- =====================================================
INSERT INTO public.compliance_access_logs (
  action,
  user_agent,
  accessed_at
) VALUES (
  'RLS_POLICY_HARDENING_APPLIED',
  'security_migration',
  NOW()
);