-- Create RPC to efficiently get products needing specs
CREATE OR REPLACE FUNCTION public.get_products_needing_specs(
  min_specs integer DEFAULT 6,
  categories text[] DEFAULT ARRAY['PANEL', 'BATTERY_MODULE']
)
RETURNS TABLE(
  product_id uuid,
  category text,
  model text,
  brand text,
  spec_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as product_id,
    p.category::text,
    p.model,
    COALESCE(m.name, 'Unknown') as brand,
    COALESCE(s.spec_count, 0) as spec_count
  FROM products p
  LEFT JOIN manufacturers m ON p.manufacturer_id = m.id
  LEFT JOIN (
    SELECT product_id, COUNT(*) as spec_count
    FROM specs
    GROUP BY product_id
  ) s ON p.id = s.product_id
  WHERE p.category::text = ANY(categories)
    AND p.status = 'active'
    AND p.pdf_path IS NOT NULL
    AND COALESCE(s.spec_count, 0) < min_specs
  ORDER BY p.category, p.model;
END;
$function$

-- Add missing readiness gates that are referenced but don't exist
INSERT INTO readiness_gates (gate_name, required_value, current_value, details) VALUES
('G3_PANEL_SPECS', 1348, 0, '{"description": "Panel specs completeness (≥6 core specs)"}'),
('G3_BATTERY_SPECS', 513, 0, '{"description": "Battery specs completeness (≥6 core specs)"}'),
('G3_INVERTER_SPECS', 2411, 0, '{"description": "Inverter specs completeness (≥6 core specs)"}')
ON CONFLICT (gate_name) DO NOTHING;

-- Add performance indexes for faster queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_category_status_pdf 
ON products(category, status) WHERE pdf_path IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_specs_product_id_count 
ON specs(product_id);

-- Update existing readiness gates with correct targets
UPDATE readiness_gates 
SET required_value = 1348, details = '{"description": "Panel specs completeness (≥6 core specs)"}'
WHERE gate_name = 'G3_PANEL_SPECS';

UPDATE readiness_gates 
SET required_value = 513, details = '{"description": "Battery specs completeness (≥6 core specs)"}'
WHERE gate_name = 'G3_BATTERY_SPECS';

UPDATE readiness_gates 
SET required_value = 2411, details = '{"description": "Inverter specs completeness (≥6 core specs)"}'
WHERE gate_name = 'G3_INVERTER_SPECS';