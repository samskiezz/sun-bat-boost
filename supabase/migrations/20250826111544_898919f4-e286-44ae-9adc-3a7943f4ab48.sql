-- Final fix for readiness gates specs counts
UPDATE readiness_gates 
SET 
  current_value = 284,
  passing = false  -- 284/513 = 55%
WHERE gate_name = 'G3_BATTERY_SPECS';

UPDATE readiness_gates 
SET 
  current_value = 680, 
  passing = false  -- 680/1348 = 50%
WHERE gate_name = 'G3_PANEL_SPECS';

UPDATE readiness_gates 
SET 
  current_value = 2411,
  passing = true   -- 2411/2411 = 100%
WHERE gate_name = 'G3_INVERTER_SPECS';