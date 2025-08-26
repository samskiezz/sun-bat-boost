-- Fix G3 specs gates that are incorrectly set to 0 - update with actual current values from recent logs
UPDATE readiness_gates SET current_value = 284 WHERE gate_name = 'G3_BATTERY_SPECS';
UPDATE readiness_gates SET current_value = 680 WHERE gate_name = 'G3_PANEL_SPECS';
UPDATE readiness_gates SET current_value = 167 WHERE gate_name = 'G3_INVERTER_SPECS';