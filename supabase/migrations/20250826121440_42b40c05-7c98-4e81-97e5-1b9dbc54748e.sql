-- Fix missing INVERTER progress entry for current job
INSERT INTO scrape_job_progress (job_id, category, target, processed, pdf_done, specs_done, state)
SELECT '29dfef69-5470-430c-ad97-0da21a531c86', 'INVERTER', 2411, 2411, 2411, 2411, 'running'
WHERE NOT EXISTS (
  SELECT 1 FROM scrape_job_progress 
  WHERE job_id = '29dfef69-5470-430c-ad97-0da21a531c86' 
  AND category = 'INVERTER'
);