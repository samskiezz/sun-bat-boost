-- Reset job progress to running state for categories that need specs extraction
UPDATE scrape_job_progress 
SET state = 'running'
WHERE job_id = '8ab47438-ef65-4b02-a830-a1f3e9749bac'
  AND (
    (category = 'PANEL' AND specs_done < target) OR
    (category = 'BATTERY_MODULE' AND specs_done < target) OR  
    (category = 'INVERTER' AND specs_done < target)
  );