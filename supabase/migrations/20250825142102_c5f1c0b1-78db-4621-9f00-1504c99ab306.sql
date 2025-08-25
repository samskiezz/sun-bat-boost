-- Add enhanced product details to support better customer identification
ALTER TABLE public.pv_modules 
ADD COLUMN IF NOT EXISTS power_rating integer,
ADD COLUMN IF NOT EXISTS image_url text,
ADD COLUMN IF NOT EXISTS description text;

ALTER TABLE public.batteries 
ADD COLUMN IF NOT EXISTS capacity_kwh numeric,
ADD COLUMN IF NOT EXISTS vpp_capable boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS image_url text,
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS nominal_capacity numeric,
ADD COLUMN IF NOT EXISTS usable_capacity numeric,
ADD COLUMN IF NOT EXISTS units integer DEFAULT 1;

-- Create indexes for better performance on new fields
CREATE INDEX IF NOT EXISTS idx_pv_power_rating ON public.pv_modules (power_rating);
CREATE INDEX IF NOT EXISTS idx_battery_capacity ON public.batteries (capacity_kwh);
CREATE INDEX IF NOT EXISTS idx_battery_vpp_capable ON public.batteries (vpp_capable);

-- Add a comprehensive products view that combines panels and batteries for easier searching
CREATE OR REPLACE VIEW public.all_products AS
SELECT 
  'panel' as product_type,
  id,
  brand,
  model,
  technology as specs,
  power_rating as rating,
  NULL as capacity,
  false as vpp_capable,
  certificate,
  approval_status,
  approval_expires,
  image_url,
  description,
  source_url,
  scraped_at
FROM public.pv_modules
UNION ALL
SELECT 
  'battery' as product_type,
  id,
  brand,
  model,
  chemistry as specs,
  NULL as rating,
  capacity_kwh as capacity,
  vpp_capable,
  certificate,
  approval_status,
  approval_expires,
  image_url,
  description,
  source_url,
  scraped_at
FROM public.batteries;

-- Add some example data for popular missing brands and models
INSERT INTO public.pv_modules (brand, model, technology, power_rating, certificate, approval_status, source_url, description) VALUES 
('Sigenergy', 'SG440M-54H', 'Monocrystalline', 440, 'IEC 61215:2021', 'approved', 'https://www.sigenergy.com', 'High efficiency monocrystalline panel with advanced cell technology'),
('Aiko Solar', 'A440-MAH54M', 'Monocrystalline', 440, 'IEC 61215:2021', 'approved', 'https://www.aikosolar.com', 'ABC (All Back Contact) technology for enhanced performance'),
('JinkoSolar', 'JKM440N-54HL4R-B', 'Monocrystalline', 440, 'IEC 61215:2021', 'approved', 'https://www.jinkosolar.com', 'Tiger Neo series with N-type TOPCon technology'),
('LONGi Solar', 'LR5-54HTH-440M', 'Monocrystalline', 440, 'IEC 61215:2021', 'approved', 'https://www.longi.com', 'Hi-MO 5 series with PERC technology')
ON CONFLICT (brand, model) DO NOTHING;

INSERT INTO public.batteries (brand, model, chemistry, capacity_kwh, vpp_capable, certificate, approval_status, source_url, description, units) VALUES 
('GoodWe', 'LX F25.6H-20', 'LiFePO4', 25.6, true, 'AS/NZS 5139:2019', 'approved', 'https://www.goodwe.com', 'Lynx F G2 series modular battery system', 8),
('Sungrow', 'SBH 25', 'LiFePO4', 25.0, true, 'AS/NZS 5139:2019', 'approved', 'https://en.sungrowpower.com', 'High voltage battery system with integrated BMS', 1),
('Sungrow', 'SBH 30', 'LiFePO4', 30.0, true, 'AS/NZS 5139:2019', 'approved', 'https://en.sungrowpower.com', 'High voltage battery system with integrated BMS', 1),
('Tesla', 'Powerwall 3', 'LiFePO4', 13.5, true, 'AS/NZS 5139:2019', 'approved', 'https://www.tesla.com', 'Integrated solar inverter and battery system', 1),
('Enphase', 'IQ Battery 5P', 'LiFePO4', 5.0, true, 'AS/NZS 5139:2019', 'approved', 'https://www.enphase.com', 'Modular AC-coupled battery system', 4)
ON CONFLICT (brand, model) DO NOTHING;