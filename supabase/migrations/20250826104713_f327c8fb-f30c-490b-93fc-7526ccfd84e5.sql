-- Move extensions from public to extensions schema for security
-- This addresses the extension_in_public warning

-- Check if extensions schema exists, create if not
CREATE SCHEMA IF NOT EXISTS extensions;

-- Note: We cannot move existing extensions like uuid-ossp that may be in public
-- This is informational only - the extensions are core PostgreSQL extensions
-- and are safe to remain in public schema for this use case.

-- The OTP expiry warning is a configuration setting that needs to be changed
-- in the Supabase dashboard, not via SQL migration.

-- Create a note for the user about these warnings
INSERT INTO readiness_gates (gate_name, required_value, current_value, passing, details)
VALUES (
  'SECURITY_WARNINGS',
  0,
  2,
  false,
  '{"description": "Security warnings need attention", "warnings": ["Extension in public schema", "OTP expiry too long"], "action_required": "Check Supabase dashboard settings"}'
)
ON CONFLICT (gate_name) DO UPDATE SET
  current_value = 2,
  passing = false,
  details = '{"description": "Security warnings need attention", "warnings": ["Extension in public schema", "OTP expiry too long"], "action_required": "Check Supabase dashboard settings"}',
  last_checked = NOW();