-- Fix the RPC function with proper column aliases
DROP FUNCTION IF EXISTS public.get_products_needing_specs(integer, text[]);

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
    p.id,
    p.category::text,
    p.model,
    COALESCE(m.name, 'Unknown') as brand,
    COALESCE(s.spec_count, 0) as spec_count
  FROM products p
  LEFT JOIN manufacturers m ON p.manufacturer_id = m.id
  LEFT JOIN (
    SELECT sp.product_id, COUNT(*) as spec_count
    FROM specs sp
    GROUP BY sp.product_id
  ) s ON p.id = s.product_id
  WHERE p.category::text = ANY(categories)
    AND p.status = 'active'
    AND p.pdf_path IS NOT NULL
    AND COALESCE(s.spec_count, 0) < min_specs
  ORDER BY p.category, p.model;
END;
$function$