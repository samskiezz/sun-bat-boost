-- Fix the type casting issue and update progress correctly

-- Update the progress to reflect the new comprehensive specs with proper type casting
UPDATE scrape_job_progress 
SET specs_done = (
  SELECT COUNT(DISTINCT p.id)
  FROM products p
  WHERE p.category::text = scrape_job_progress.category 
    AND p.status = 'active'
    AND (SELECT COUNT(*) FROM specs s WHERE s.product_id = p.id) >= 6
),
state = CASE 
  WHEN (SELECT COUNT(DISTINCT p.id)
        FROM products p
        WHERE p.category::text = scrape_job_progress.category 
          AND p.status = 'active'
          AND (SELECT COUNT(*) FROM specs s WHERE s.product_id = p.id) >= 6) >= target 
  THEN 'completed'
  ELSE 'running'
END
WHERE job_id = '13db72b3-cd4b-4379-b644-f14d04e81202' 
  AND category IN ('PANEL', 'BATTERY_MODULE');