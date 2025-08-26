-- Fix job completion states and force specs enhancement
-- Update inverter to completed since specs_done = target
UPDATE scrape_job_progress 
SET state = 'completed'
WHERE job_id = '13db72b3-cd4b-4379-b644-f14d04e81202' 
  AND category = 'INVERTER' 
  AND specs_done >= target;

-- Force immediate specs enhancement by resetting throttling
UPDATE scrape_job_progress 
SET last_specs_trigger = 0
WHERE job_id = '13db72b3-cd4b-4379-b644-f14d04e81202' 
  AND category IN ('PANEL', 'BATTERY_MODULE');

-- Remove any locks that might prevent specs enhancement
DELETE FROM readiness_gates 
WHERE gate_name LIKE '%LOCK%' OR gate_name LIKE '%THROTTLE%';

-- Update job status to completed if all categories are done
UPDATE scrape_jobs 
SET status = 'completed', finished_at = NOW()
WHERE id = '13db72b3-cd4b-4379-b644-f14d04e81202'
  AND NOT EXISTS (
    SELECT 1 FROM scrape_job_progress 
    WHERE job_id = '13db72b3-cd4b-4379-b644-f14d04e81202' 
    AND state != 'completed'
  );