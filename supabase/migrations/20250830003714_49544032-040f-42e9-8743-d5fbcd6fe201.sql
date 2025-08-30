
-- 1) Compliance tables

CREATE TABLE IF NOT EXISTS public.compliance_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_code TEXT NOT NULL UNIQUE,
  standard_reference TEXT NOT NULL,
  rule_description TEXT NOT NULL,
  validation_logic JSONB NOT NULL DEFAULT '{}'::jsonb,
  severity TEXT NOT NULL CHECK (severity IN ('info','warning','error')),
  auto_fixable BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.compliance_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id TEXT NOT NULL,
  system_design JSONB NOT NULL,
  check_results JSONB NOT NULL,
  overall_status TEXT NOT NULL CHECK (overall_status IN ('compliant','non_compliant','warning')),
  evidence_package JSONB NOT NULL DEFAULT '{}'::jsonb,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) Monitoring tables

CREATE TABLE IF NOT EXISTS public.drift_monitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_name TEXT NOT NULL UNIQUE,
  model_name TEXT NOT NULL,
  monitor_type TEXT NOT NULL,          -- e.g., 'data', 'concept', 'performance'
  thresholds JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',-- 'active' | 'paused'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.drift_detections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_id UUID NOT NULL REFERENCES public.drift_monitors(id) ON DELETE CASCADE,
  detection_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  drift_score DOUBLE PRECISION NOT NULL,
  drift_type TEXT NOT NULL,            -- e.g., 'covariate', 'prediction', 'concept'
  severity TEXT NOT NULL,              -- 'low' | 'medium' | 'high' | 'critical'
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  remediated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3) Indexes

CREATE INDEX IF NOT EXISTS idx_compliance_checks_site_id ON public.compliance_checks(site_id);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_checked_at ON public.compliance_checks(checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_drift_detections_monitor_timestamp ON public.drift_detections(monitor_id, detection_timestamp DESC);

-- 4) Enable RLS

ALTER TABLE public.compliance_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drift_monitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drift_detections ENABLE ROW LEVEL SECURITY;

-- Development policies (permissive). Replace with proper auth-scoped policies later.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'compliance_rules' AND policyname = 'Allow all operations on compliance_rules'
  ) THEN
    CREATE POLICY "Allow all operations on compliance_rules" ON public.compliance_rules FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'compliance_checks' AND policyname = 'Allow all operations on compliance_checks'
  ) THEN
    CREATE POLICY "Allow all operations on compliance_checks" ON public.compliance_checks FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'drift_monitors' AND policyname = 'Allow all operations on drift_monitors'
  ) THEN
    CREATE POLICY "Allow all operations on drift_monitors" ON public.drift_monitors FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'drift_detections' AND policyname = 'Allow all operations on drift_detections'
  ) THEN
    CREATE POLICY "Allow all operations on drift_detections" ON public.drift_detections FOR ALL USING (true) WITH CHECK (true);
  END IF;
END$$;

-- 5) updated_at triggers (function already exists in this project: public.update_updated_at_column)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_compliance_rules_updated_at'
  ) THEN
    CREATE TRIGGER trg_compliance_rules_updated_at
    BEFORE UPDATE ON public.compliance_rules
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_drift_monitors_updated_at'
  ) THEN
    CREATE TRIGGER trg_drift_monitors_updated_at
    BEFORE UPDATE ON public.drift_monitors
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END$$;
