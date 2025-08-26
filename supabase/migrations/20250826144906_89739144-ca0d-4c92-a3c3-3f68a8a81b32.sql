-- Create function to get spec counts by category
CREATE OR REPLACE FUNCTION get_spec_counts_by_category()
RETURNS TABLE(
  category text,
  total_products bigint,
  products_with_6plus_specs bigint,
  products_with_any_specs bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.category::text,
    COUNT(*) as total_products,
    COUNT(CASE WHEN s.spec_count >= 6 THEN 1 END) as products_with_6plus_specs,
    COUNT(CASE WHEN s.spec_count >= 1 THEN 1 END) as products_with_any_specs
  FROM products p
  LEFT JOIN (
    SELECT product_id, COUNT(*) as spec_count
    FROM specs
    GROUP BY product_id
  ) s ON p.id = s.product_id
  WHERE p.category IN ('PANEL', 'BATTERY_MODULE', 'INVERTER') AND p.status = 'active'
  GROUP BY p.category
  ORDER BY p.category;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;