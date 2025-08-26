-- Create readiness gates for PDF requirements
INSERT INTO readiness_gates (gate_name, required_value, current_value, passing, details)
VALUES 
  ('panels_with_pdfs', 1348, 0, false, '{"description": "All panels must have PDF datasheets with specifications"}'),
  ('batteries_with_pdfs', 513, 0, false, '{"description": "All batteries must have PDF datasheets with specifications"}'),
  ('specs_completeness', 0.95, 0, false, '{"description": "95% of products must have comprehensive specifications extracted"}')
ON CONFLICT (gate_name) DO UPDATE SET
  required_value = EXCLUDED.required_value,
  details = EXCLUDED.details;