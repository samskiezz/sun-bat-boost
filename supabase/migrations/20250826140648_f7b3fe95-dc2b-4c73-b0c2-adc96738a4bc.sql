-- Reset throttling to allow immediate specs enhancement
UPDATE scrape_job_progress 
SET last_specs_trigger = 0 
WHERE job_id = '13db72b3-cd4b-4379-b644-f14d04e81202';

-- Force trigger specs enhancement for all categories
DELETE FROM readiness_gates WHERE gate_name = 'SPECS_ENHANCEMENT_LOCK';