-- Restore original readiness gate requirements for complete coverage
UPDATE readiness_gates 
SET 
  required_value = 1348,
  passing = CASE WHEN current_value >= 1348 THEN true ELSE false END,
  last_checked = NOW()
WHERE gate_name = 'G3_PANEL_SPECS';

UPDATE readiness_gates 
SET 
  required_value = 513,
  passing = CASE WHEN current_value >= 513 THEN true ELSE false END,
  last_checked = NOW()
WHERE gate_name = 'G3_BATTERY_SPECS';

UPDATE readiness_gates 
SET 
  required_value = 2411,
  passing = CASE WHEN current_value >= 2411 THEN true ELSE false END,
  last_checked = NOW()
WHERE gate_name = 'G3_INVERTER_SPECS';

-- Restore training episodes requirement to full 50,000
UPDATE readiness_gates 
SET 
  required_value = 50000,
  passing = CASE WHEN current_value >= 50000 THEN true ELSE false END,
  last_checked = NOW()
WHERE gate_name = 'training_episodes';