-- Create energy_plans table for storing live AER PRD data
CREATE TABLE IF NOT EXISTS public.energy_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id TEXT NOT NULL UNIQUE, -- AER plan ID
  retailer TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  state TEXT NOT NULL,
  network TEXT,
  meter_type TEXT NOT NULL CHECK (meter_type IN ('Single', 'TOU', 'Demand')),
  supply_c_per_day DECIMAL(10,4) NOT NULL,
  usage_c_per_kwh_peak DECIMAL(10,4) NOT NULL,
  usage_c_per_kwh_shoulder DECIMAL(10,4),
  usage_c_per_kwh_offpeak DECIMAL(10,4), 
  fit_c_per_kwh DECIMAL(10,4) DEFAULT 0,
  demand_c_per_kw DECIMAL(10,4),
  controlled_c_per_kwh DECIMAL(10,4),
  tou_windows JSONB DEFAULT '[]'::jsonb,
  effective_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_energy_plans_state_meter ON public.energy_plans(state, meter_type);
CREATE INDEX IF NOT EXISTS idx_energy_plans_retailer ON public.energy_plans(retailer);
CREATE INDEX IF NOT EXISTS idx_energy_plans_updated ON public.energy_plans(last_updated);

-- Create trigger for updating last_updated
CREATE TRIGGER update_energy_plans_updated_at
  BEFORE UPDATE ON public.energy_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.energy_plans ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (energy plans are public data)
CREATE POLICY "Energy plans are publicly readable" 
  ON public.energy_plans 
  FOR SELECT 
  USING (true);

-- Create plan_scores table for ranking results
CREATE TABLE IF NOT EXISTS public.plan_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calc_context_hash TEXT NOT NULL,
  plan_id TEXT NOT NULL REFERENCES public.energy_plans(plan_id),
  annual_bill DECIMAL(10,2) NOT NULL,
  annual_savings DECIMAL(10,2) NOT NULL,
  rank INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plan_scores_context ON public.plan_scores(calc_context_hash);
CREATE INDEX IF NOT EXISTS idx_plan_scores_rank ON public.plan_scores(calc_context_hash, rank);

-- Enable RLS for plan_scores
ALTER TABLE public.plan_scores ENABLE ROW LEVEL SECURITY;

-- Public read access for plan scores
CREATE POLICY "Plan scores are publicly readable" 
  ON public.plan_scores 
  FOR SELECT 
  USING (true);