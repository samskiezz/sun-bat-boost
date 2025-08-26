-- Add missing readiness gates that are referenced but don't exist
INSERT INTO readiness_gates (gate_name, required_value, current_value, details) VALUES
('G3_PANEL_SPECS', 1348, 0, '{"description": "Panel specs completeness (≥6 core specs)"}'),
('G3_BATTERY_SPECS', 513, 0, '{"description": "Battery specs completeness (≥6 core specs)"}'),
('G3_INVERTER_SPECS', 2411, 0, '{"description": "Inverter specs completeness (≥6 core specs)"}')
ON CONFLICT (gate_name) DO NOTHING