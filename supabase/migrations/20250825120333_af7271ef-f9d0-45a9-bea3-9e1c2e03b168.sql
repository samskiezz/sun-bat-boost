-- Create tables for CEC approved products and VPP providers

-- CEC approved solar panels
CREATE TABLE public.cec_panels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  model_number TEXT NOT NULL,
  watts INTEGER NOT NULL,
  efficiency DECIMAL(4,2),
  dimensions_length DECIMAL(6,2),
  dimensions_width DECIMAL(6,2),
  weight DECIMAL(6,2),
  technology TEXT,
  approved_date DATE,
  expiry_date DATE,
  cec_listing_id TEXT UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- CEC approved batteries
CREATE TABLE public.cec_batteries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  model_number TEXT NOT NULL,
  capacity_kwh DECIMAL(6,2) NOT NULL,
  usable_capacity_kwh DECIMAL(6,2),
  voltage DECIMAL(6,2),
  chemistry TEXT,
  warranty_years INTEGER,
  cycles INTEGER,
  dimensions_length DECIMAL(6,2),
  dimensions_width DECIMAL(6,2),
  dimensions_height DECIMAL(6,2),
  weight DECIMAL(6,2),
  approved_date DATE,
  expiry_date DATE,
  cec_listing_id TEXT UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- CEC approved inverters
CREATE TABLE public.cec_inverters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  model_number TEXT NOT NULL,
  ac_output_kw DECIMAL(6,2) NOT NULL,
  dc_input_kw DECIMAL(6,2),
  efficiency DECIMAL(5,3),
  phases INTEGER,
  type TEXT, -- string, micro, power optimizer
  mppt_channels INTEGER,
  dimensions_length DECIMAL(6,2),
  dimensions_width DECIMAL(6,2),
  dimensions_height DECIMAL(6,2),
  weight DECIMAL(6,2),
  approved_date DATE,
  expiry_date DATE,
  cec_listing_id TEXT UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- VPP providers and their compatibility
CREATE TABLE public.vpp_providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  company TEXT NOT NULL,
  signup_bonus DECIMAL(8,2) DEFAULT 0,
  estimated_annual_reward DECIMAL(8,2) DEFAULT 0,
  min_battery_kwh DECIMAL(6,2) DEFAULT 0,
  max_battery_kwh DECIMAL(6,2),
  compatible_battery_brands TEXT[], -- Array of battery brands
  compatible_inverter_brands TEXT[], -- Array of inverter brands
  states_available TEXT[], -- Array of state codes
  website TEXT,
  contact_phone TEXT,
  requirements TEXT,
  terms_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Battery-VPP compatibility junction table
CREATE TABLE public.battery_vpp_compatibility (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  battery_id UUID REFERENCES public.cec_batteries(id) ON DELETE CASCADE,
  vpp_provider_id UUID REFERENCES public.vpp_providers(id) ON DELETE CASCADE,
  compatibility_score INTEGER DEFAULT 100, -- 0-100 compatibility rating
  notes TEXT,
  verified_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(battery_id, vpp_provider_id)
);

-- Data refresh tracking
CREATE TABLE public.cec_data_refresh_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  refresh_type TEXT NOT NULL, -- 'panels', 'batteries', 'inverters', 'vpp'
  status TEXT NOT NULL, -- 'success', 'failed', 'in_progress'
  records_updated INTEGER DEFAULT 0,
  records_added INTEGER DEFAULT 0,
  records_deactivated INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  data_source_url TEXT
);

-- Enable Row Level Security (though this is public data)
ALTER TABLE public.cec_panels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cec_batteries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cec_inverters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vpp_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battery_vpp_compatibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cec_data_refresh_log ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (no auth required for public data)
CREATE POLICY "Public read access for CEC panels" ON public.cec_panels FOR SELECT USING (true);
CREATE POLICY "Public read access for CEC batteries" ON public.cec_batteries FOR SELECT USING (true);
CREATE POLICY "Public read access for CEC inverters" ON public.cec_inverters FOR SELECT USING (true);
CREATE POLICY "Public read access for VPP providers" ON public.vpp_providers FOR SELECT USING (true);
CREATE POLICY "Public read access for battery VPP compatibility" ON public.battery_vpp_compatibility FOR SELECT USING (true);
CREATE POLICY "Public read access for refresh log" ON public.cec_data_refresh_log FOR SELECT USING (true);

-- Create indexes for better performance
CREATE INDEX idx_cec_panels_brand_model ON public.cec_panels(brand, model);
CREATE INDEX idx_cec_panels_watts ON public.cec_panels(watts);
CREATE INDEX idx_cec_panels_active ON public.cec_panels(is_active) WHERE is_active = true;

CREATE INDEX idx_cec_batteries_brand_model ON public.cec_batteries(brand, model);
CREATE INDEX idx_cec_batteries_capacity ON public.cec_batteries(capacity_kwh);
CREATE INDEX idx_cec_batteries_active ON public.cec_batteries(is_active) WHERE is_active = true;

CREATE INDEX idx_cec_inverters_brand_model ON public.cec_inverters(brand, model);
CREATE INDEX idx_cec_inverters_output ON public.cec_inverters(ac_output_kw);
CREATE INDEX idx_cec_inverters_active ON public.cec_inverters(is_active) WHERE is_active = true;

CREATE INDEX idx_vpp_providers_active ON public.vpp_providers(is_active) WHERE is_active = true;
CREATE INDEX idx_vpp_providers_battery_range ON public.vpp_providers(min_battery_kwh, max_battery_kwh);

-- Create trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_cec_panels_updated_at BEFORE UPDATE ON public.cec_panels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cec_batteries_updated_at BEFORE UPDATE ON public.cec_batteries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cec_inverters_updated_at BEFORE UPDATE ON public.cec_inverters FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vpp_providers_updated_at BEFORE UPDATE ON public.vpp_providers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();