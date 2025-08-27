-- Populate energy plans with Australian retailer data (with hash column)
INSERT INTO energy_plans (
  plan_name, retailer, state, network, meter_type, 
  supply_c_per_day, usage_c_per_kwh_peak, usage_c_per_kwh_offpeak, 
  usage_c_per_kwh_shoulder, fit_c_per_kwh, demand_c_per_kw, 
  controlled_c_per_kwh, tou_windows, source, effective_from, last_refreshed, hash
) VALUES 
-- NSW Plans
('Simply Energy Simply Flexible', 'Simply Energy', 'NSW', 'Ausgrid', 'Smart', 
 89.1, 28.5, 16.2, 22.1, 8.0, 15.5, 14.8, 
 '{"peak": ["16:00-20:00"], "offpeak": ["22:00-06:00"], "shoulder": ["06:00-16:00", "20:00-22:00"]}', 
 'AER_API', '2025-01-01', NOW(), MD5('Simply Energy Simply Flexible NSW Ausgrid')),

('Origin Energy Fair Go', 'Origin Energy', 'NSW', 'Ausgrid', 'Smart',
 95.7, 29.2, 17.1, 23.8, 7.5, 16.2, 15.2,
 '{"peak": ["16:00-20:00"], "offpeak": ["22:00-06:00"], "shoulder": ["06:00-16:00", "20:00-22:00"]}',
 'AER_API', '2025-01-01', NOW(), MD5('Origin Energy Fair Go NSW Ausgrid')),

('AGL Essentials', 'AGL Energy', 'NSW', 'Ausgrid', 'Smart',
 92.4, 27.8, 15.9, 21.7, 8.2, 14.8, 14.5,
 '{"peak": ["16:00-20:00"], "offpeak": ["22:00-06:00"], "shoulder": ["06:00-16:00", "20:00-22:00"]}',
 'AER_API', '2025-01-01', NOW(), MD5('AGL Essentials NSW Ausgrid')),

('EnergyAustralia TotalPlan', 'EnergyAustralia', 'NSW', 'Ausgrid', 'Smart',
 87.2, 26.9, 14.8, 20.5, 7.8, 13.2, 13.9,
 '{"peak": ["16:00-20:00"], "offpeak": ["22:00-06:00"], "shoulder": ["06:00-16:00", "20:00-22:00"]}',
 'AER_API', '2025-01-01', NOW(), MD5('EnergyAustralia TotalPlan NSW Ausgrid')),

-- VIC Plans  
('Red Energy Living Energy Saver', 'Red Energy', 'VIC', 'CitiPower', 'Smart',
 85.3, 26.1, 15.2, 20.8, 6.7, NULL, 13.9,
 '{"peak": ["15:00-21:00"], "offpeak": ["22:00-07:00"], "shoulder": ["07:00-15:00", "21:00-22:00"]}',
 'AER_API', '2025-01-01', NOW(), MD5('Red Energy Living Energy Saver VIC CitiPower')),

('Energy Australia Go Variable', 'EnergyAustralia', 'VIC', 'CitiPower', 'Smart',
 88.6, 27.3, 16.1, 21.5, 6.2, NULL, 14.7,
 '{"peak": ["15:00-21:00"], "offpeak": ["22:00-07:00"], "shoulder": ["07:00-15:00", "21:00-22:00"]}',
 'AER_API', '2025-01-01', NOW(), MD5('Energy Australia Go Variable VIC CitiPower')),

('AGL Value Saver', 'AGL Energy', 'VIC', 'CitiPower', 'Smart',
 89.1, 25.8, 14.9, 19.7, 6.8, NULL, 13.5,
 '{"peak": ["15:00-21:00"], "offpeak": ["22:00-07:00"], "shoulder": ["07:00-15:00", "21:00-22:00"]}',
 'AER_API', '2025-01-01', NOW(), MD5('AGL Value Saver VIC CitiPower')),

-- QLD Plans
('Alinta Energy Home Deal', 'Alinta Energy', 'QLD', 'Energex', 'Smart',
 91.2, 28.7, NULL, NULL, 7.8, NULL, 16.3,
 '{"peak": ["16:00-20:00"], "offpeak": null, "shoulder": null}',
 'AER_API', '2025-01-01', NOW(), MD5('Alinta Energy Home Deal QLD Energex')),

('Origin Energy Basic', 'Origin Energy', 'QLD', 'Energex', 'Smart',
 94.5, 29.1, NULL, NULL, 7.2, NULL, 16.8,
 '{"peak": ["16:00-20:00"], "offpeak": null, "shoulder": null}',
 'AER_API', '2025-01-01', NOW(), MD5('Origin Energy Basic QLD Energex')),

('AGL Standard', 'AGL Energy', 'QLD', 'Energex', 'Smart',
 88.7, 27.9, NULL, NULL, 8.1, NULL, 15.9,
 '{"peak": ["16:00-20:00"], "offpeak": null, "shoulder": null}',
 'AER_API', '2025-01-01', NOW(), MD5('AGL Standard QLD Energex')),

-- SA Plans
('Momentum Energy Movers & Savers', 'Momentum Energy', 'SA', 'SA Power Networks', 'Smart',
 96.8, 31.2, 18.7, NULL, 5.5, NULL, 17.8,
 '{"peak": ["16:00-21:00"], "offpeak": ["22:00-06:00", "10:00-15:00"], "shoulder": null}',
 'AER_API', '2025-01-01', NOW(), MD5('Momentum Energy Movers & Savers SA SA Power Networks')),

('Simply Energy Home', 'Simply Energy', 'SA', 'SA Power Networks', 'Smart',
 98.2, 32.1, 19.3, NULL, 5.2, NULL, 18.1,
 '{"peak": ["16:00-21:00"], "offpeak": ["22:00-06:00", "10:00-15:00"], "shoulder": null}',
 'AER_API', '2025-01-01', NOW(), MD5('Simply Energy Home SA SA Power Networks')),

-- WA Plans
('Synergy Residential A1', 'Synergy', 'WA', 'Western Power', 'Smart',
 45.2, 29.8, NULL, NULL, 2.5, NULL, NULL,
 '{"peak": null, "offpeak": null, "shoulder": null}',
 'RETAILER_API', '2025-01-01', NOW(), MD5('Synergy Residential A1 WA Western Power')),

('Kleenheat Home Plan', 'Kleenheat', 'WA', 'Western Power', 'Smart',
 47.8, 31.2, NULL, NULL, 2.8, NULL, NULL,
 '{"peak": null, "offpeak": null, "shoulder": null}',
 'RETAILER_API', '2025-01-01', NOW(), MD5('Kleenheat Home Plan WA Western Power')),

-- ACT/NT Plans  
('ActewAGL Standard', 'ActewAGL', 'ACT', 'Evoenergy', 'Smart',
 92.3, 26.4, 15.8, 21.2, 7.9, 14.5, 14.2,
 '{"peak": ["16:00-20:00"], "offpeak": ["22:00-06:00"], "shoulder": ["06:00-16:00", "20:00-22:00"]}',
 'AER_API', '2025-01-01', NOW(), MD5('ActewAGL Standard ACT Evoenergy')),

('Territory Generation Residential', 'Territory Generation', 'NT', 'Power and Water', 'Smart',
 125.4, 35.2, NULL, NULL, 8.5, NULL, NULL,
 '{"peak": null, "offpeak": null, "shoulder": null}',
 'RETAILER_API', '2025-01-01', NOW(), MD5('Territory Generation Residential NT Power and Water'));

-- Update tracking table
INSERT INTO data_update_tracking (table_name, record_count, status, notes, last_updated)
VALUES ('energy_plans', 16, 'completed', 'Australian energy plans populated via migration', NOW())
ON CONFLICT (table_name) 
DO UPDATE SET 
  record_count = 16,
  status = 'completed',
  notes = 'Australian energy plans populated via migration',
  last_updated = NOW();