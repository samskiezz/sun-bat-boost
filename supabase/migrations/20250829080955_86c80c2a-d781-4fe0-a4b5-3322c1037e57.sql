-- First, let's check if we have DNSP data and populate if needed
INSERT INTO dnsps_static (postcode, version, state, network, export_cap_kw, phase_limit) VALUES
-- SA postcodes
(5000, 'v1', 'SA', 'SA Power Networks', 5.0, '1P≤5kW;3P≤10kW'),
(5001, 'v1', 'SA', 'SA Power Networks', 5.0, '1P≤5kW;3P≤10kW'),
(5006, 'v1', 'SA', 'SA Power Networks', 5.0, '1P≤5kW;3P≤10kW'),
(5066, 'v1', 'SA', 'SA Power Networks', 5.0, '1P≤5kW;3P≤10kW'),
(5067, 'v1', 'SA', 'SA Power Networks', 5.0, '1P≤5kW;3P≤10kW'),
-- NSW postcodes
(2000, 'v1', 'NSW', 'Ausgrid', 5.0, '1P≤5kW;3P≤10kW'),
(2001, 'v1', 'NSW', 'Ausgrid', 5.0, '1P≤5kW;3P≤10kW'),
(2010, 'v1', 'NSW', 'Ausgrid', 5.0, '1P≤5kW;3P≤10kW'),
(2020, 'v1', 'NSW', 'Ausgrid', 5.0, '1P≤5kW;3P≤10kW'),
-- VIC postcodes
(3000, 'v1', 'VIC', 'CitiPower', 5.0, '1P≤5kW;3P≤10kW'),
(3001, 'v1', 'VIC', 'CitiPower', 5.0, '1P≤5kW;3P≤10kW'),
(3141, 'v1', 'VIC', 'CitiPower', 5.0, '1P≤5kW;3P≤10kW'),
-- QLD postcodes  
(4000, 'v1', 'QLD', 'Energex', 5.0, '1P≤5kW;3P≤10kW'),
(4001, 'v1', 'QLD', 'Energex', 5.0, '1P≤5kW;3P≤10kW'),
(4006, 'v1', 'QLD', 'Energex', 5.0, '1P≤5kW;3P≤10kW'),
-- WA postcodes
(6000, 'v1', 'WA', 'Western Power', 5.0, '1P≤5kW;3P≤10kW'),
(6001, 'v1', 'WA', 'Western Power', 5.0, '1P≤5kW;3P≤10kW'),
(6006, 'v1', 'WA', 'Western Power', 5.0, '1P≤5kW;3P≤10kW')
ON CONFLICT (postcode, version) DO UPDATE SET
  state = EXCLUDED.state,
  network = EXCLUDED.network,
  export_cap_kw = EXCLUDED.export_cap_kw,
  phase_limit = EXCLUDED.phase_limit;