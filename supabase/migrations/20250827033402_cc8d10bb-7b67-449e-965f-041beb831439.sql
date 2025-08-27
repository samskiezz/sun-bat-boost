-- Create energy plans and related tables
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Energy plans table for storing retailer plans from Energy Made Easy and other sources
CREATE TABLE IF NOT EXISTS energy_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  retailer TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  state TEXT NOT NULL,
  network TEXT NOT NULL,
  meter_type TEXT NOT NULL,
  supply_c_per_day DOUBLE PRECISION NOT NULL,
  usage_c_per_kwh_peak DOUBLE PRECISION NOT NULL,
  usage_c_per_kwh_shoulder DOUBLE PRECISION,
  usage_c_per_kwh_offpeak DOUBLE PRECISION,
  fit_c_per_kwh DOUBLE PRECISION NOT NULL,
  demand_c_per_kw DOUBLE PRECISION,
  controlled_c_per_kwh DOUBLE PRECISION,
  tou_windows JSONB NOT NULL,
  effective_from TIMESTAMPTZ NOT NULL,
  effective_to TIMESTAMPTZ,
  source TEXT NOT NULL,
  hash TEXT UNIQUE NOT NULL,
  last_refreshed TIMESTAMPTZ NOT NULL
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_energy_plans_state_net_meter ON energy_plans(state, network, meter_type);

-- DNSP (Distribution Network Service Provider) table
CREATE TABLE IF NOT EXISTS dnsps (
  id SERIAL PRIMARY KEY,
  state TEXT NOT NULL,
  postcode_start INT NOT NULL,
  postcode_end INT NOT NULL,
  network TEXT NOT NULL,
  export_cap_kw DOUBLE PRECISION DEFAULT 5.0
);

-- Plan scoring results
CREATE TABLE IF NOT EXISTS plan_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID REFERENCES energy_plans(id) ON DELETE CASCADE,
  calc_context_hash TEXT NOT NULL,
  annual_cost_aud DOUBLE PRECISION NOT NULL,
  delta_vs_baseline_aud DOUBLE PRECISION NOT NULL,
  fit_value DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User selected plans
CREATE TABLE IF NOT EXISTS selected_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scenario_id TEXT NOT NULL,
  plan_id UUID REFERENCES energy_plans(id) ON DELETE SET NULL,
  chosen_by_user BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS policies
ALTER TABLE energy_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE selected_plans ENABLE ROW LEVEL SECURITY;

-- Allow public read access to energy plans and scores
CREATE POLICY "Allow public read access to energy plans" ON energy_plans FOR SELECT USING (true);
CREATE POLICY "Allow public read access to plan scores" ON plan_scores FOR SELECT USING (true);
CREATE POLICY "Allow public operations on selected plans" ON selected_plans FOR ALL USING (true);