-- Seed comprehensive DNSP data for all Australian postcodes
INSERT INTO dnsps (state, postcode_start, postcode_end, network, export_cap_kw) VALUES
-- NSW - Ausgrid (Sydney Metro)
('NSW', 2000, 2249, 'Ausgrid', 5.0),
('NSW', 2250, 2299, 'Ausgrid', 5.0),

-- NSW - Endeavour Energy (Western Sydney, Blue Mountains, Central Coast, Hunter Valley)
('NSW', 2300, 2339, 'Endeavour Energy', 5.0),
('NSW', 2745, 2786, 'Endeavour Energy', 5.0),
('NSW', 2150, 2179, 'Endeavour Energy', 5.0),
('NSW', 2200, 2234, 'Endeavour Energy', 5.0),

-- NSW - Essential Energy (Rural and Regional NSW)
('NSW', 2340, 2599, 'Essential Energy', 5.0),
('NSW', 2620, 2899, 'Essential Energy', 5.0),
('NSW', 2400, 2490, 'Essential Energy', 5.0),

-- ACT - Evoenergy
('ACT', 2600, 2618, 'Evoenergy', 5.0),
('ACT', 2900, 2920, 'Evoenergy', 5.0),

-- VIC - CitiPower (Melbourne CBD and inner suburbs)
('VIC', 3000, 3006, 'CitiPower', 5.0),
('VIC', 3008, 3008, 'CitiPower', 5.0),
('VIC', 3031, 3031, 'CitiPower', 5.0),
('VIC', 3121, 3121, 'CitiPower', 5.0),
('VIC', 3141, 3142, 'CitiPower', 5.0),

-- VIC - Powercor (Western Melbourne, Western Victoria)
('VIC', 3012, 3030, 'Powercor', 5.0),
('VIC', 3032, 3120, 'Powercor', 5.0),
('VIC', 3200, 3249, 'Powercor', 5.0),
('VIC', 3300, 3399, 'Powercor', 5.0),
('VIC', 3400, 3499, 'Powercor', 5.0),

-- VIC - AusNet Services (Eastern and Northern Melbourne, Eastern Victoria)
('VIC', 3122, 3140, 'AusNet Services', 5.0),
('VIC', 3143, 3199, 'AusNet Services', 5.0),
('VIC', 3620, 3699, 'AusNet Services', 5.0),
('VIC', 3700, 3799, 'AusNet Services', 5.0),
('VIC', 3800, 3999, 'AusNet Services', 5.0),

-- VIC - United Energy (South Eastern Melbourne, Mornington Peninsula)
('VIC', 3150, 3199, 'United Energy', 5.0),
('VIC', 3930, 3944, 'United Energy', 5.0),

-- QLD - Energex (South East Queensland)
('QLD', 4000, 4179, 'Energex', 5.0),
('QLD', 4200, 4299, 'Energex', 5.0),
('QLD', 4300, 4399, 'Energex', 5.0),
('QLD', 4500, 4519, 'Energex', 5.0),

-- QLD - Ergon Energy (Regional Queensland)
('QLD', 4180, 4199, 'Ergon Energy', 5.0),
('QLD', 4400, 4499, 'Ergon Energy', 5.0),
('QLD', 4520, 4899, 'Ergon Energy', 5.0),
('QLD', 4900, 4999, 'Ergon Energy', 5.0),

-- SA - SA Power Networks (All of South Australia)
('SA', 5000, 5199, 'SA Power Networks', 10.0),
('SA', 5200, 5299, 'SA Power Networks', 10.0),
('SA', 5300, 5399, 'SA Power Networks', 10.0),
('SA', 5400, 5499, 'SA Power Networks', 10.0),
('SA', 5500, 5599, 'SA Power Networks', 10.0),
('SA', 5600, 5699, 'SA Power Networks', 10.0),
('SA', 5700, 5799, 'SA Power Networks', 10.0),

-- WA - Western Power (South West Interconnected System)
('WA', 6000, 6199, 'Western Power', 5.0),
('WA', 6200, 6299, 'Western Power', 5.0),
('WA', 6300, 6399, 'Western Power', 5.0),
('WA', 6400, 6499, 'Western Power', 5.0),
('WA', 6500, 6599, 'Western Power', 5.0),
('WA', 6600, 6699, 'Western Power', 5.0),
('WA', 6700, 6799, 'Western Power', 5.0),

-- TAS - TasNetworks (All of Tasmania)
('TAS', 7000, 7099, 'TasNetworks', 5.0),
('TAS', 7100, 7199, 'TasNetworks', 5.0),
('TAS', 7200, 7299, 'TasNetworks', 5.0),
('TAS', 7300, 7399, 'TasNetworks', 5.0),

-- NT - Power and Water Corporation (All of Northern Territory)
('NT', 800, 899, 'Power and Water Corporation', 5.0),
('NT', 900, 999, 'Power and Water Corporation', 5.0)

ON CONFLICT DO NOTHING;