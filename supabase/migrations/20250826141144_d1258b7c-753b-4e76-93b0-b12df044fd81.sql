-- Manually trigger specs enhancement by calling the specs-enhancer function
-- This will bypass the throttling and force immediate processing

-- First, let's also make sure we force update any stale progress
UPDATE scrape_job_progress 
SET last_specs_trigger = 0,
    state = CASE 
      WHEN specs_done >= target THEN 'completed'
      ELSE 'running' 
    END
WHERE job_id = '13db72b3-cd4b-4379-b644-f14d04e81202';

-- Force trigger specs enhancement immediately
SELECT pg_notify('specs_enhancement_needed', 
  json_build_object(
    'job_id', '13db72b3-cd4b-4379-b644-f14d04e81202',
    'categories', ARRAY['PANEL', 'BATTERY_MODULE'],
    'force', true
  )::text
);