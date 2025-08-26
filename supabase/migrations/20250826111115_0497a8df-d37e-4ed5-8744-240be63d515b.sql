-- Update job progress to reflect actual specs counts
UPDATE scrape_job_progress 
SET specs_done = CASE 
  WHEN category = 'PANEL' THEN 680
  WHEN category = 'BATTERY_MODULE' THEN 284  
  WHEN category = 'INVERTER' THEN 2411
  ELSE specs_done
END,
state = CASE
  WHEN category = 'INVERTER' THEN 'completed'  -- INVERTER has all specs
  ELSE 'running'  -- PANEL and BATTERY still need more specs
END
WHERE job_id = '8ab47438-ef65-4b02-a830-a1f3e9749bac';