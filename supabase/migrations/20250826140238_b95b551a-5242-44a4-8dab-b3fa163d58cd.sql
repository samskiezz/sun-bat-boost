-- Force update the progress to match actual database state
UPDATE scrape_job_progress 
SET 
  specs_done = CASE 
    WHEN category = 'PANEL' THEN (
      SELECT COUNT(DISTINCT p.id) 
      FROM products p 
      WHERE p.category = 'PANEL' 
      AND p.status = 'active' 
      AND EXISTS (SELECT 1 FROM specs s WHERE s.product_id = p.id)
    )
    WHEN category = 'INVERTER' THEN (
      SELECT COUNT(DISTINCT p.id) 
      FROM products p 
      WHERE p.category = 'INVERTER' 
      AND p.status = 'active' 
      AND EXISTS (SELECT 1 FROM specs s WHERE s.product_id = p.id)
    )
    WHEN category = 'BATTERY_MODULE' THEN (
      SELECT COUNT(DISTINCT p.id) 
      FROM products p 
      WHERE p.category = 'BATTERY_MODULE' 
      AND p.status = 'active' 
      AND EXISTS (SELECT 1 FROM specs s WHERE s.product_id = p.id)
    )
  END,
  last_specs_trigger = NULL -- Reset throttling
WHERE job_id = '13db72b3-cd4b-4379-b644-f14d04e81202';