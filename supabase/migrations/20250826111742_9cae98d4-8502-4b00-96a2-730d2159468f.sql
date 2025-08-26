-- Force update readiness gates with correct values
UPDATE readiness_gates SET current_value = 284 WHERE gate_name = 'G3_BATTERY_SPECS';
UPDATE readiness_gates SET current_value = 680 WHERE gate_name = 'G3_PANEL_SPECS'; 
UPDATE readiness_gates SET current_value = 2411 WHERE gate_name = 'G3_INVERTER_SPECS';