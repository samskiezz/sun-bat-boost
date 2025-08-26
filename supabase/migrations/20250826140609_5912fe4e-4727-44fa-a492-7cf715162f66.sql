-- Fix G3 readiness gates to show actual comprehensive specs counts
UPDATE readiness_gates 
SET current_value = CASE 
  WHEN gate_name = 'G3_PANEL_SPECS' THEN (
    SELECT COUNT(DISTINCT p.id) 
    FROM products p
    JOIN (
      SELECT product_id, COUNT(*) as spec_count 
      FROM specs 
      GROUP BY product_id 
      HAVING COUNT(*) >= 6
    ) spec_counts ON p.id = spec_counts.product_id
    WHERE p.category = 'PANEL' AND p.status = 'active'
  )
  WHEN gate_name = 'G3_BATTERY_SPECS' THEN (
    SELECT COUNT(DISTINCT p.id) 
    FROM products p
    JOIN (
      SELECT product_id, COUNT(*) as spec_count 
      FROM specs 
      GROUP BY product_id 
      HAVING COUNT(*) >= 6
    ) spec_counts ON p.id = spec_counts.product_id
    WHERE p.category = 'BATTERY_MODULE' AND p.status = 'active'
  )
  WHEN gate_name = 'G3_INVERTER_SPECS' THEN (
    SELECT COUNT(DISTINCT p.id) 
    FROM products p
    JOIN (
      SELECT product_id, COUNT(*) as spec_count 
      FROM specs 
      GROUP BY product_id 
      HAVING COUNT(*) >= 6
    ) spec_counts ON p.id = spec_counts.product_id
    WHERE p.category = 'INVERTER' AND p.status = 'active'
  )
  ELSE current_value
END,
passing = CASE 
  WHEN gate_name = 'G3_PANEL_SPECS' THEN (
    SELECT COUNT(DISTINCT p.id) >= required_value
    FROM products p
    JOIN (
      SELECT product_id, COUNT(*) as spec_count 
      FROM specs 
      GROUP BY product_id 
      HAVING COUNT(*) >= 6
    ) spec_counts ON p.id = spec_counts.product_id
    WHERE p.category = 'PANEL' AND p.status = 'active'
  )
  WHEN gate_name = 'G3_BATTERY_SPECS' THEN (
    SELECT COUNT(DISTINCT p.id) >= required_value
    FROM products p
    JOIN (
      SELECT product_id, COUNT(*) as spec_count 
      FROM specs 
      GROUP BY product_id 
      HAVING COUNT(*) >= 6
    ) spec_counts ON p.id = spec_counts.product_id
    WHERE p.category = 'BATTERY_MODULE' AND p.status = 'active'
  )
  WHEN gate_name = 'G3_INVERTER_SPECS' THEN (
    SELECT COUNT(DISTINCT p.id) >= required_value
    FROM products p
    JOIN (
      SELECT product_id, COUNT(*) as spec_count 
      FROM specs 
      GROUP BY product_id 
      HAVING COUNT(*) >= 6
    ) spec_counts ON p.id = spec_counts.product_id
    WHERE p.category = 'INVERTER' AND p.status = 'active'
  )
  ELSE passing
END
WHERE gate_name IN ('G3_PANEL_SPECS', 'G3_BATTERY_SPECS', 'G3_INVERTER_SPECS');