-- Force all categories back to running since they need specs extraction
UPDATE scrape_job_progress 
SET state = 'running'
WHERE job_id = '8ab47438-ef65-4b02-a830-a1f3e9749bac';