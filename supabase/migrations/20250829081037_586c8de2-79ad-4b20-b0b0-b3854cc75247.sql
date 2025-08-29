-- Populate DNSP data with correct column names
INSERT INTO dnsps_static (postcode, version, state, dnsp_code, dnsp_name, export_cap_kw, phase_limit, overlap_pct) VALUES
-- SA postcodes
(5000, 'v1', 'SA', 'SAPN', 'SA Power Networks', 5.0, '1P≤5kW;3P≤10kW', 100.0),
(5001, 'v1', 'SA', 'SAPN', 'SA Power Networks', 5.0, '1P≤5kW;3P≤10kW', 100.0),
(5006, 'v1', 'SA', 'SAPN', 'SA Power Networks', 5.0, '1P≤5kW;3P≤10kW', 100.0),
(5066, 'v1', 'SA', 'SAPN', 'SA Power Networks', 5.0, '1P≤5kW;3P≤10kW', 100.0),
(5067, 'v1', 'SA', 'SAPN', 'SA Power Networks', 5.0, '1P≤5kW;3P≤10kW', 100.0),
-- NSW postcodes
(2000, 'v1', 'NSW', 'AUSGRID', 'Ausgrid', 5.0, '1P≤5kW;3P≤10kW', 100.0),
(2001, 'v1', 'NSW', 'AUSGRID', 'Ausgrid', 5.0, '1P≤5kW;3P≤10kW', 100.0),
(2010, 'v1', 'NSW', 'AUSGRID', 'Ausgrid', 5.0, '1P≤5kW;3P≤10kW', 100.0),
(2020, 'v1', 'NSW', 'AUSGRID', 'Ausgrid', 5.0, '1P≤5kW;3P≤10kW', 100.0),
-- VIC postcodes
(3000, 'v1', 'VIC', 'CITIPOWER', 'CitiPower', 5.0, '1P≤5kW;3P≤10kW', 100.0),
(3001, 'v1', 'VIC', 'CITIPOWER', 'CitiPower', 5.0, '1P≤5kW;3P≤10kW', 100.0),
(3141, 'v1', 'VIC', 'CITIPOWER', 'CitiPower', 5.0, '1P≤5kW;3P≤10kW', 100.0),
-- QLD postcodes  
(4000, 'v1', 'QLD', 'ENERGEX', 'Energex', 5.0, '1P≤5kW;3P≤10kW', 100.0),
(4001, 'v1', 'QLD', 'ENERGEX', 'Energex', 5.0, '1P≤5kW;3P≤10kW', 100.0),
(4006, 'v1', 'QLD', 'ENERGEX', 'Energex', 5.0, '1P≤5kW;3P≤10kW', 100.0),
-- WA postcodes
(6000, 'v1', 'WA', 'WESTERN', 'Western Power', 5.0, '1P≤5kW;3P≤10kW', 100.0),
(6001, 'v1', 'WA', 'WESTERN', 'Western Power', 5.0, '1P≤5kW;3P≤10kW', 100.0),
(6006, 'v1', 'WA', 'WESTERN', 'Western Power', 5.0, '1P≤5kW;3P≤10kW', 100.0)
ON CONFLICT (postcode, version) DO UPDATE SET
  state = EXCLUDED.state,
  dnsp_code = EXCLUDED.dnsp_code,
  dnsp_name = EXCLUDED.dnsp_name,
  export_cap_kw = EXCLUDED.export_cap_kw,
  phase_limit = EXCLUDED.phase_limit,
  overlap_pct = EXCLUDED.overlap_pct;