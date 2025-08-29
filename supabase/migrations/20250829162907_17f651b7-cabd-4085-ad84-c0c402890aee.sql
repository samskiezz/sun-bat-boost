-- Physics PV Digital Twin tables
CREATE TABLE public.pv_twins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id TEXT NOT NULL,
  location JSONB NOT NULL, -- lat, lng, timezone
  system_config JSONB NOT NULL, -- panels, inverters, tilt, azimuth
  physics_params JSONB NOT NULL, -- soiling, albedo, bifacial gains
  simulation_results JSONB, -- P50/P90 curves, monthly/hourly data
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3D Roof and Shading Analysis
CREATE TABLE public.roof_models (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id TEXT NOT NULL,
  mesh_data JSONB NOT NULL, -- 3D roof geometry
  obstructions JSONB NOT NULL, -- trees, buildings, etc.
  shade_analysis JSONB, -- hourly shading factors
  vegetation_forecast JSONB, -- tree growth predictions
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tariff and VPP Optimization
CREATE TABLE public.tariff_optimizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id TEXT NOT NULL,
  tariff_data JSONB NOT NULL, -- real-time tariff rules
  vpp_rules JSONB, -- VPP constraints and rewards
  dispatch_schedule JSONB, -- charge/discharge windows
  savings_projections JSONB, -- P50/P90 savings
  optimization_params JSONB, -- multi-objective weights
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Uncertainty and Causal Analysis
CREATE TABLE public.uncertainty_models (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model_type TEXT NOT NULL, -- 'roi', 'sizing', 'production'
  conformal_intervals JSONB NOT NULL, -- P10/P50/P90 quantiles
  causal_effects JSONB, -- treatment effects with CI
  calibration_data JSONB, -- historical accuracy
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Active Learning and Synthetic Data
CREATE TABLE public.learning_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id TEXT NOT NULL,
  case_type TEXT NOT NULL, -- 'hard_case', 'synthetic', 'meter_feedback'
  ground_truth JSONB, -- actual outcomes
  model_predictions JSONB, -- what models predicted
  feedback_type TEXT NOT NULL, -- 'correction', 'validation', 'synthetic'
  retrain_priority INTEGER DEFAULT 1,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- OCR Ensemble and Consensus
CREATE TABLE public.ocr_consensus (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id TEXT NOT NULL,
  ocr_results JSONB NOT NULL, -- results from multiple OCR engines
  consensus_output JSONB, -- voted/fused results
  confidence_scores JSONB, -- per-field confidence
  catalog_matches JSONB, -- fuzzy matches to product catalog
  validation_status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Data Contracts and Validation
CREATE TABLE public.data_contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_name TEXT NOT NULL UNIQUE,
  schema_definition JSONB NOT NULL, -- Great Expectations suite
  validation_rules JSONB NOT NULL,
  sla_thresholds JSONB NOT NULL, -- red/yellow/green thresholds
  last_validation TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'active', -- active, deprecated
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.data_validation_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.data_contracts(id),
  pipeline_name TEXT NOT NULL,
  validation_results JSONB NOT NULL, -- pass/fail per rule
  overall_status TEXT NOT NULL, -- red, yellow, green
  data_sample JSONB, -- sample of validated data
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Feature Store (Feast integration)
CREATE TABLE public.feature_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_name TEXT NOT NULL UNIQUE,
  feature_type TEXT NOT NULL, -- 'batch', 'streaming', 'online'
  data_source JSONB NOT NULL, -- source configuration
  transformation_logic JSONB, -- feature engineering
  ttl_seconds INTEGER, -- time-to-live for online features
  tags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.feature_values (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_name TEXT NOT NULL,
  entity_id TEXT NOT NULL, -- site_id, customer_id, etc.
  feature_value JSONB NOT NULL,
  event_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Model Registry and Deployment
CREATE TABLE public.model_registry (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model_name TEXT NOT NULL,
  version TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'development', -- development, staging, production
  model_type TEXT NOT NULL, -- 'onnx', 'pytorch', 'sklearn'
  artifact_path TEXT, -- path to model files
  metrics JSONB, -- validation metrics
  deployment_config JSONB, -- Triton config, resource requirements
  shadow_traffic_pct DOUBLE PRECISION DEFAULT 0, -- for A/B testing
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(model_name, version)
);

-- Drift and Quality Monitoring
CREATE TABLE public.drift_monitors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  monitor_name TEXT NOT NULL UNIQUE,
  model_name TEXT NOT NULL,
  monitor_type TEXT NOT NULL, -- 'data_drift', 'concept_drift', 'performance'
  reference_data JSONB, -- baseline distribution or performance
  alert_thresholds JSONB, -- warning and critical thresholds
  last_check TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.drift_detections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  monitor_id UUID NOT NULL REFERENCES public.drift_monitors(id),
  detection_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  drift_score DOUBLE PRECISION NOT NULL,
  drift_type TEXT NOT NULL,
  affected_features JSONB, -- which features are drifting
  severity TEXT NOT NULL, -- green, yellow, red
  alert_sent BOOLEAN DEFAULT false,
  remediation_status TEXT DEFAULT 'pending'
);

-- RAG over Specs and Standards
CREATE TABLE public.document_embeddings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id TEXT NOT NULL,
  document_type TEXT NOT NULL, -- 'datasheet', 'standard', 'manual'
  chunk_index INTEGER NOT NULL,
  chunk_text TEXT NOT NULL,
  embedding VECTOR(1536), -- OpenAI embedding dimension
  metadata JSONB, -- page number, section, etc.
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(document_id, chunk_index)
);

-- Compliance and Guardrails
CREATE TABLE public.compliance_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_code TEXT NOT NULL UNIQUE,
  standard_reference TEXT NOT NULL, -- AS/NZS 3000, 4777.1, etc.
  rule_description TEXT NOT NULL,
  validation_logic JSONB NOT NULL, -- rule implementation
  severity TEXT NOT NULL DEFAULT 'warning', -- info, warning, error
  auto_fixable BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.compliance_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id TEXT NOT NULL,
  system_design JSONB NOT NULL, -- the design being checked
  check_results JSONB NOT NULL, -- per-rule results
  overall_status TEXT NOT NULL, -- compliant, non_compliant, warning
  evidence_package JSONB, -- supporting documentation
  checked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Experiments and A/B Testing
CREATE TABLE public.experiments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  experiment_name TEXT NOT NULL UNIQUE,
  experiment_type TEXT NOT NULL, -- 'ab_test', 'multivariate', 'bandit'
  hypothesis TEXT,
  variants JSONB NOT NULL, -- variant configurations
  allocation_strategy JSONB NOT NULL, -- traffic allocation
  success_metrics JSONB NOT NULL, -- what to measure
  status TEXT DEFAULT 'draft', -- draft, running, completed, stopped
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  results JSONB, -- statistical results
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.experiment_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  experiment_id UUID NOT NULL REFERENCES public.experiments(id),
  entity_id TEXT NOT NULL, -- user_id, session_id, etc.
  variant_name TEXT NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(experiment_id, entity_id)
);

-- Time Series Store for Meter Data
CREATE TABLE public.meter_readings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id TEXT NOT NULL,
  meter_type TEXT NOT NULL, -- 'import', 'export', 'load', 'generation'
  reading_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  value_kwh DOUBLE PRECISION NOT NULL,
  interval_minutes INTEGER NOT NULL DEFAULT 30,
  data_quality TEXT DEFAULT 'good', -- good, estimated, missing
  source TEXT, -- retailer, smart_meter, manual
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_pv_twins_site_id ON public.pv_twins(site_id);
CREATE INDEX idx_roof_models_site_id ON public.roof_models(site_id);
CREATE INDEX idx_tariff_optimizations_site_id ON public.tariff_optimizations(site_id);
CREATE INDEX idx_learning_feedback_processed ON public.learning_feedback(processed, retrain_priority);
CREATE INDEX idx_data_validation_runs_contract_id ON public.data_validation_runs(contract_id);
CREATE INDEX idx_feature_values_entity_timestamp ON public.feature_values(entity_id, event_timestamp);
CREATE INDEX idx_drift_detections_monitor_timestamp ON public.drift_detections(monitor_id, detection_timestamp);
CREATE INDEX idx_compliance_checks_site_id ON public.compliance_checks(site_id);
CREATE INDEX idx_meter_readings_site_timestamp ON public.meter_readings(site_id, reading_timestamp);

-- Enable RLS on all tables
ALTER TABLE public.pv_twins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roof_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tariff_optimizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uncertainty_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ocr_consensus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_validation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drift_monitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drift_detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meter_readings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (public read access for now, can be restricted later)
CREATE POLICY "Allow all operations" ON public.pv_twins FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.roof_models FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.tariff_optimizations FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.uncertainty_models FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.learning_feedback FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.ocr_consensus FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.data_contracts FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.data_validation_runs FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.feature_definitions FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.feature_values FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.model_registry FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.drift_monitors FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.drift_detections FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.document_embeddings FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.compliance_rules FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.compliance_checks FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.experiments FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.experiment_assignments FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.meter_readings FOR ALL USING (true);

-- Create triggers for updated_at columns
CREATE TRIGGER update_pv_twins_updated_at BEFORE UPDATE ON public.pv_twins FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_roof_models_updated_at BEFORE UPDATE ON public.roof_models FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tariff_optimizations_updated_at BEFORE UPDATE ON public.tariff_optimizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_uncertainty_models_updated_at BEFORE UPDATE ON public.uncertainty_models FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_data_contracts_updated_at BEFORE UPDATE ON public.data_contracts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_feature_definitions_updated_at BEFORE UPDATE ON public.feature_definitions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_model_registry_updated_at BEFORE UPDATE ON public.model_registry FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_drift_monitors_updated_at BEFORE UPDATE ON public.drift_monitors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_compliance_rules_updated_at BEFORE UPDATE ON public.compliance_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_experiments_updated_at BEFORE UPDATE ON public.experiments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();