-- Fix readiness gates to match actual data
UPDATE readiness_gates 
SET 
  required_value = CASE 
    WHEN gate_name = 'G1_INVERTER_COVERAGE' THEN 2411
    WHEN gate_name = 'G2_INVERTER_PDFS' THEN 2411
    ELSE required_value
  END,
  current_value = CASE
    WHEN gate_name = 'G3_PANEL_SPECS' THEN 680
    WHEN gate_name = 'G3_BATTERY_SPECS' THEN 284
    WHEN gate_name = 'G3_INVERTER_SPECS' THEN 2411
    ELSE current_value
  END,
  passing = CASE
    WHEN gate_name = 'G3_INVERTER_SPECS' THEN true  -- All inverter specs done
    WHEN gate_name = 'G3_PANEL_SPECS' THEN false    -- Only 680/1348 panel specs
    WHEN gate_name = 'G3_BATTERY_SPECS' THEN false  -- Only 284/513 battery specs
    ELSE passing
  END
WHERE gate_name IN (
  'G1_INVERTER_COVERAGE', 'G2_INVERTER_PDFS', 
  'G3_PANEL_SPECS', 'G3_BATTERY_SPECS', 'G3_INVERTER_SPECS'
);