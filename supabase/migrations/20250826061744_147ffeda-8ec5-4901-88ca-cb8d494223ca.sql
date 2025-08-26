-- Fix remaining function search paths
CREATE OR REPLACE FUNCTION public.check_data_freshness(table_name_param text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  last_update TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT last_updated INTO last_update 
  FROM public.data_update_tracking 
  WHERE table_name = table_name_param;
  
  -- If no record found or older than 7 days, needs update
  RETURN (last_update IS NULL OR last_update < NOW() - INTERVAL '7 days');
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_data_tracking(table_name_param text, count_param integer, status_param text DEFAULT 'completed'::text, notes_param text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.data_update_tracking (table_name, record_count, status, notes, last_updated)
  VALUES (table_name_param, count_param, status_param, notes_param, NOW())
  ON CONFLICT (table_name) 
  DO UPDATE SET 
    record_count = count_param,
    status = status_param,
    notes = notes_param,
    last_updated = NOW();
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_product_counts_by_category()
 RETURNS TABLE(category text, total_count bigint, active_count bigint, with_datasheet_count bigint, with_pdf_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        p.category::TEXT,
        COUNT(*)::BIGINT as total_count,
        COUNT(CASE WHEN p.status = 'active' THEN 1 END)::BIGINT as active_count,
        COUNT(CASE WHEN p.datasheet_url IS NOT NULL THEN 1 END)::BIGINT as with_datasheet_count,
        COUNT(CASE WHEN p.pdf_path IS NOT NULL THEN 1 END)::BIGINT as with_pdf_count
    FROM products p
    GROUP BY p.category
    ORDER BY p.category;
END;
$function$;