-- Clean up duplicate job progress records and fix corrupted data

-- Delete progress records from old/stale jobs (keep only the current job)
DELETE FROM scrape_job_progress 
WHERE job_id != '13db72b3-cd4b-4379-b644-f14d04e81202';

-- Fix the corrupted PANEL data for the current job by getting real counts from database
UPDATE scrape_job_progress 
SET 
  processed = (SELECT COUNT(*) FROM products WHERE category = 'PANEL' AND status = 'active'),
  pdf_done = (SELECT COUNT(*) FROM products WHERE category = 'PANEL' AND status = 'active' AND pdf_path IS NOT NULL),
  specs_done = (
    SELECT COUNT(DISTINCT product_id) 
    FROM specs s 
    JOIN products p ON s.product_id = p.id 
    WHERE p.category = 'PANEL' AND p.status = 'active'
  )
WHERE job_id = '13db72b3-cd4b-4379-b644-f14d04e81202' 
  AND category = 'PANEL';

-- Ensure all categories have proper targets
UPDATE scrape_job_progress 
SET target = CASE 
  WHEN category = 'PANEL' THEN 1348
  WHEN category = 'INVERTER' THEN 2411  
  WHEN category = 'BATTERY_MODULE' THEN 513
  ELSE target
END
WHERE job_id = '13db72b3-cd4b-4379-b644-f14d04e81202';