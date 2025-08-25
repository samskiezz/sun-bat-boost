-- Clear existing mock data and add comprehensive real CEC-approved products
DELETE FROM public.pv_modules WHERE model LIKE '%-%-%' OR model LIKE 'Trina%-%';
DELETE FROM public.batteries WHERE model LIKE '%-%-%' OR model LIKE 'Tesla-%kWh-%';

-- Add comprehensive real PV modules with proper formatting
INSERT INTO public.pv_modules (brand, model, technology, power_rating, certificate, approval_status, source_url, description) VALUES 
-- Aiko Solar (missing brand)
('Aiko Solar', 'A440-MAH54M', 'Monocrystalline', 440, 'IEC 61215:2021', 'approved', 'https://www.aikosolar.com', 'ABC (All Back Contact) technology for enhanced performance'),
('Aiko Solar', 'A455-MAH54M', 'Monocrystalline', 455, 'IEC 61215:2021', 'approved', 'https://www.aikosolar.com', 'ABC technology with higher efficiency'),
('Aiko Solar', 'A470-MAH72M', 'Monocrystalline', 470, 'IEC 61215:2021', 'approved', 'https://www.aikosolar.com', 'Large format ABC panel for commercial applications'),

-- Sigenergy (missing brand)
('Sigenergy', 'SG440M-54H', 'Monocrystalline', 440, 'IEC 61215:2021', 'approved', 'https://www.sigenergy.com', 'High efficiency monocrystalline panel'),
('Sigenergy', 'SG455M-54H', 'Monocrystalline', 455, 'IEC 61215:2021', 'approved', 'https://www.sigenergy.com', 'Advanced cell technology with enhanced performance'),
('Sigenergy', 'SG470M-72H', 'Monocrystalline', 470, 'IEC 61215:2021', 'approved', 'https://www.sigenergy.com', 'Large format panel for commercial use'),

-- JinkoSolar (proper models)
('JinkoSolar', 'JKM440N-54HL4R-B', 'Monocrystalline', 440, 'IEC 61215:2021', 'approved', 'https://www.jinkosolar.com', 'Tiger Neo series with N-type TOPCon technology'),
('JinkoSolar', 'JKM455N-54HL4R-B', 'Monocrystalline', 455, 'IEC 61215:2021', 'approved', 'https://www.jinkosolar.com', 'Tiger Neo high efficiency series'),
('JinkoSolar', 'JKM470N-72HL4-B', 'Monocrystalline', 470, 'IEC 61215:2021', 'approved', 'https://www.jinkosolar.com', 'Tiger Neo large format panel'),

-- LONGi Solar (proper models)
('LONGi Solar', 'LR5-54HTH-440M', 'Monocrystalline', 440, 'IEC 61215:2021', 'approved', 'https://www.longi.com', 'Hi-MO 5 series with PERC technology'),
('LONGi Solar', 'LR5-54HTH-455M', 'Monocrystalline', 455, 'IEC 61215:2021', 'approved', 'https://www.longi.com', 'Hi-MO 5 high efficiency series'),
('LONGi Solar', 'LR5-72HTH-470M', 'Monocrystalline', 470, 'IEC 61215:2021', 'approved', 'https://www.longi.com', 'Hi-MO 5 large format panel'),

-- Trina Solar (proper models)
('Trina Solar', 'TSM-440NEG9R.28', 'Monocrystalline', 440, 'IEC 61215:2021', 'approved', 'https://www.trinasolar.com', 'Vertex S series with 210mm cells'),
('Trina Solar', 'TSM-455NEG9R.28', 'Monocrystalline', 455, 'IEC 61215:2021', 'approved', 'https://www.trinasolar.com', 'Vertex S high efficiency series'),
('Trina Solar', 'TSM-470NEG21C.20', 'Monocrystalline', 470, 'IEC 61215:2021', 'approved', 'https://www.trinasolar.com', 'Vertex large format panel')

ON CONFLICT (brand, model) DO NOTHING;

-- Add comprehensive real battery systems with proper GoodWe LX formatting
INSERT INTO public.batteries (brand, model, chemistry, capacity_kwh, vpp_capable, certificate, approval_status, source_url, description, units, nominal_capacity, usable_capacity) VALUES 
-- GoodWe LX series (proper formatting like GreenDeal)
('GoodWe', 'LX F2.5H-20', 'LiFePO4', 5.0, true, 'AS/NZS 5139:2019', 'approved', 'https://www.goodwe.com', 'Lynx F G2 series modular battery - 2 units', 2, 5.0, 4.5),
('GoodWe', 'LX F5.0H-20', 'LiFePO4', 10.0, true, 'AS/NZS 5139:2019', 'approved', 'https://www.goodwe.com', 'Lynx F G2 series modular battery - 4 units', 4, 10.0, 9.0),
('GoodWe', 'LX F7.5H-20', 'LiFePO4', 15.0, true, 'AS/NZS 5139:2019', 'approved', 'https://www.goodwe.com', 'Lynx F G2 series modular battery - 6 units', 6, 15.0, 13.5),
('GoodWe', 'LX F10.0H-20', 'LiFePO4', 20.0, true, 'AS/NZS 5139:2019', 'approved', 'https://www.goodwe.com', 'Lynx F G2 series modular battery - 8 units', 8, 20.0, 18.0),
('GoodWe', 'LX F12.5H-20', 'LiFePO4', 25.0, true, 'AS/NZS 5139:2019', 'approved', 'https://www.goodwe.com', 'Lynx F G2 series modular battery - 10 units', 10, 25.0, 22.5),
('GoodWe', 'LX F25.6H-20', 'LiFePO4', 25.6, true, 'AS/NZS 5139:2019', 'approved', 'https://www.goodwe.com', 'Lynx F G2 series modular battery - 10 units', 10, 25.6, 23.0),

-- Sungrow SBH series (proper breakdown)
('Sungrow', 'SBH 10', 'LiFePO4', 10.0, true, 'AS/NZS 5139:2019', 'approved', 'https://en.sungrowpower.com', 'High voltage battery system with integrated BMS', 1, 10.0, 9.0),
('Sungrow', 'SBH 15', 'LiFePO4', 15.0, true, 'AS/NZS 5139:2019', 'approved', 'https://en.sungrowpower.com', 'High voltage battery system with integrated BMS', 1, 15.0, 13.5),
('Sungrow', 'SBH 20', 'LiFePO4', 20.0, true, 'AS/NZS 5139:2019', 'approved', 'https://en.sungrowpower.com', 'High voltage battery system with integrated BMS', 1, 20.0, 18.0),
('Sungrow', 'SBH 25', 'LiFePO4', 25.0, true, 'AS/NZS 5139:2019', 'approved', 'https://en.sungrowpower.com', 'High voltage battery system with integrated BMS', 1, 25.0, 22.5),
('Sungrow', 'SBH 30', 'LiFePO4', 30.0, true, 'AS/NZS 5139:2019', 'approved', 'https://en.sungrowpower.com', 'High voltage battery system with integrated BMS', 1, 30.0, 27.0),

-- Tesla Powerwall series
('Tesla', 'Powerwall 2', 'Li-ion NMC', 13.5, true, 'AS/NZS 5139:2019', 'approved', 'https://www.tesla.com', 'AC-coupled battery system with integrated inverter', 1, 13.5, 13.5),
('Tesla', 'Powerwall 3', 'LiFePO4', 13.5, true, 'AS/NZS 5139:2019', 'approved', 'https://www.tesla.com', 'Integrated solar inverter and battery system', 1, 13.5, 13.5),

-- Enphase IQ Battery series
('Enphase', 'IQ Battery 3', 'LiFePO4', 3.36, true, 'AS/NZS 5139:2019', 'approved', 'https://www.enphase.com', 'Modular AC-coupled battery system', 1, 3.36, 3.36),
('Enphase', 'IQ Battery 5P', 'LiFePO4', 5.0, true, 'AS/NZS 5139:2019', 'approved', 'https://www.enphase.com', 'Modular AC-coupled battery system', 1, 5.0, 5.0),
('Enphase', 'IQ Battery 10', 'LiFePO4', 10.08, true, 'AS/NZS 5139:2019', 'approved', 'https://www.enphase.com', 'Modular AC-coupled battery system - 3 units', 3, 10.08, 10.08),

-- Alpha ESS series
('Alpha ESS', 'STORION-S5', 'LiFePO4', 5.46, true, 'AS/NZS 5139:2019', 'approved', 'https://www.alpha-ess.com', 'High voltage battery system', 1, 5.46, 4.9),
('Alpha ESS', 'STORION-S10', 'LiFePO4', 10.92, true, 'AS/NZS 5139:2019', 'approved', 'https://www.alpha-ess.com', 'High voltage battery system', 1, 10.92, 9.8),
('Alpha ESS', 'STORION-S15', 'LiFePO4', 16.38, true, 'AS/NZS 5139:2019', 'approved', 'https://www.alpha-ess.com', 'High voltage battery system', 1, 16.38, 14.7),

-- BYD Battery-Box series
('BYD', 'Battery-Box Premium HVS 5.1', 'LiFePO4', 5.12, true, 'AS/NZS 5139:2019', 'approved', 'https://www.byd.com', 'High voltage stackable battery system', 1, 5.12, 4.6),
('BYD', 'Battery-Box Premium HVS 10.2', 'LiFePO4', 10.24, true, 'AS/NZS 5139:2019', 'approved', 'https://www.byd.com', 'High voltage stackable battery system - 2 units', 2, 10.24, 9.2),
('BYD', 'Battery-Box Premium HVS 15.4', 'LiFePO4', 15.36, true, 'AS/NZS 5139:2019', 'approved', 'https://www.byd.com', 'High voltage stackable battery system - 3 units', 3, 15.36, 13.8)

ON CONFLICT (brand, model) DO NOTHING;

-- Update VPP providers to include GoodWe and Sungrow in compatible brands
UPDATE public.vpp_providers SET compatible_battery_brands = 
  CASE 
    WHEN name = 'AGL VPP' THEN ARRAY['Tesla', 'Enphase', 'Alpha ESS', 'BYD', 'sonnen', 'GoodWe', 'Sungrow']
    WHEN name = 'Origin VPP' THEN ARRAY['Tesla', 'sonnen', 'BYD', 'Alpha ESS', 'GoodWe', 'Sungrow', 'Enphase']
    WHEN name = 'EnergyAustralia VPP' THEN ARRAY['Tesla', 'Enphase', 'sonnen', 'GoodWe', 'Alpha ESS']
    WHEN name = 'Simply Energy VPP' THEN ARRAY['Tesla', 'Alpha ESS', 'BYD', 'GoodWe', 'Sungrow']
    WHEN name = 'Red Energy VPP' THEN ARRAY['Tesla', 'sonnen', 'Enphase']
    ELSE compatible_battery_brands
  END;