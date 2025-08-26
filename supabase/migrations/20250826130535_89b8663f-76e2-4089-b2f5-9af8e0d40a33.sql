-- Reset the frozen job to allow restart
UPDATE scrape_jobs 
SET status = 'completed', finished_at = now()
WHERE id = '29dfef69-5470-430c-ad97-0da21a531c86';

-- Reset readiness gates that might be blocking
UPDATE readiness_gates 
SET current_value = 0 
WHERE gate_name IN ('G3_PANEL_SPECS', 'G3_BATTERY_SPECS', 'G3_INVERTER_SPECS');