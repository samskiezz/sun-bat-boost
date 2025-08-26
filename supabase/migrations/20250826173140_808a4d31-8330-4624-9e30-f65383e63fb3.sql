-- Clean up duplicate job progress entries and keep only the latest job
DELETE FROM scrape_job_progress 
WHERE job_id NOT IN (
  SELECT id FROM scrape_jobs 
  ORDER BY created_at DESC 
  LIMIT 1
);

-- Update the remaining progress entries with correct state
UPDATE scrape_job_progress SET state = 'completed' 
WHERE category = 'INVERTER' AND specs_done >= target;

UPDATE scrape_job_progress SET state = 'running' 
WHERE category IN ('PANEL', 'BATTERY_MODULE') AND specs_done < target;