-- Insert sample energy plans data
INSERT INTO energy_plans (retailer, plan_name, state, network, meter_type, supply_c_per_day, usage_c_per_kwh_peak, usage_c_per_kwh_shoulder, usage_c_per_kwh_offpeak, fit_c_per_kwh, demand_c_per_kw, controlled_c_per_kwh, tou_windows, effective_from, source, hash, last_refreshed) VALUES
('Demo Energy', 'Simple Saver', 'NSW', 'Ausgrid', 'TOU', 110.0, 40.0, 28.0, 18.0, 7.0, NULL, 18.0, '[
  {"label":"peak", "days":[1,2,3,4,5], "start":"14:00", "end":"20:00"},
  {"label":"shoulder", "days":[1,2,3,4,5], "start":"07:00", "end":"14:00"},
  {"label":"shoulder", "days":[1,2,3,4,5], "start":"20:00", "end":"22:00"},
  {"label":"offpeak", "days":[1,2,3,4,5], "start":"22:00", "end":"07:00"},
  {"label":"offpeak", "days":[0,6], "start":"00:00", "end":"24:00"}
]'::jsonb, NOW(), 'DEMO', 'demo-1', NOW()),

('Origin Energy', 'Predictable Plan', 'NSW', 'Ausgrid', 'TOU', 98.45, 42.0, 25.0, 15.0, 5.0, NULL, 15.0, '[
  {"label":"peak", "days":[1,2,3,4,5], "start":"14:00", "end":"20:00"},
  {"label":"shoulder", "days":[1,2,3,4,5], "start":"07:00", "end":"14:00"},
  {"label":"shoulder", "days":[1,2,3,4,5], "start":"20:00", "end":"22:00"},
  {"label":"offpeak", "days":[1,2,3,4,5], "start":"22:00", "end":"07:00"},
  {"label":"offpeak", "days":[0,6], "start":"00:00", "end":"24:00"}
]'::jsonb, NOW(), 'DEMO', 'demo-2', NOW()),

('AGL Energy', 'Essentials Plan', 'NSW', 'Ausgrid', 'TOU', 87.12, 38.0, 26.0, 16.0, 6.7, NULL, 16.0, '[
  {"label":"peak", "days":[1,2,3,4,5], "start":"14:00", "end":"20:00"},
  {"label":"shoulder", "days":[1,2,3,4,5], "start":"07:00", "end":"14:00"},
  {"label":"shoulder", "days":[1,2,3,4,5], "start":"20:00", "end":"22:00"},
  {"label":"offpeak", "days":[1,2,3,4,5], "start":"22:00", "end":"07:00"},
  {"label":"offpeak", "days":[0,6], "start":"00:00", "end":"24:00"}
]'::jsonb, NOW(), 'DEMO', 'demo-3', NOW()),

('EnergyAustralia', 'Total Plan Flex', 'NSW', 'Ausgrid', 'TOU', 123.50, 44.5, 29.8, 17.2, 8.1, NULL, 17.2, '[
  {"label":"peak", "days":[1,2,3,4,5], "start":"14:00", "end":"20:00"},
  {"label":"shoulder", "days":[1,2,3,4,5], "start":"07:00", "end":"14:00"},
  {"label":"shoulder", "days":[1,2,3,4,5], "start":"20:00", "end":"22:00"},
  {"label":"offpeak", "days":[1,2,3,4,5], "start":"22:00", "end":"07:00"},
  {"label":"offpeak", "days":[0,6], "start":"00:00", "end":"24:00"}
]'::jsonb, NOW(), 'DEMO', 'demo-4', NOW()),

('Red Energy', 'Living Energy Saver', 'NSW', 'Ausgrid', 'TOU', 95.67, 39.2, 24.8, 14.5, 6.2, NULL, 14.5, '[
  {"label":"peak", "days":[1,2,3,4,5], "start":"14:00", "end":"20:00"},
  {"label":"shoulder", "days":[1,2,3,4,5], "start":"07:00", "end":"14:00"},
  {"label":"shoulder", "days":[1,2,3,4,5], "start":"20:00", "end":"22:00"},
  {"label":"offpeak", "days":[1,2,3,4,5], "start":"22:00", "end":"07:00"},
  {"label":"offpeak", "days":[0,6], "start":"00:00", "end":"24:00"}
]'::jsonb, NOW(), 'DEMO', 'demo-5', NOW());