-- Fix function search path security issues by setting explicit search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.refresh_battery_data()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
    result_count INTEGER;
BEGIN
    -- This function will be updated to handle the CEC battery data
    -- For now, we'll prepare the structure
    
    SELECT COUNT(*) INTO result_count FROM batteries;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Battery refresh function created',
        'current_count', result_count
    );
END;
$function$;