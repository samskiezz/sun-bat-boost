-- Fix security warning by setting search_path for check_readiness_gates function
CREATE OR REPLACE FUNCTION check_readiness_gates()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    result jsonb;
    all_passing boolean;
    gates_data jsonb;
    message_text text;
BEGIN
    -- Get all readiness gates
    SELECT jsonb_agg(
        jsonb_build_object(
            'gate', gate_name,
            'required', required_value,
            'current', current_value,
            'passing', passing,
            'description', COALESCE(details->>'description', 'System readiness check')
        )
    ) INTO gates_data
    FROM readiness_gates;
    
    -- Check if all gates are passing
    SELECT COALESCE(bool_and(passing), false) INTO all_passing
    FROM readiness_gates;
    
    -- Set message based on status
    IF all_passing THEN
        message_text := 'All readiness gates are passing - system is ready';
    ELSE
        message_text := 'Some readiness gates are not passing - system is not ready yet';
    END IF;
    
    -- If no gates exist, return default gates
    IF gates_data IS NULL THEN
        gates_data := jsonb_build_array(
            jsonb_build_object(
                'gate', 'data_collection',
                'required', 1000,
                'current', 0,
                'passing', false,
                'description', 'Minimum product data collected'
            ),
            jsonb_build_object(
                'gate', 'training_episodes',
                'required', 50000,
                'current', 0,
                'passing', false,
                'description', 'AI training episodes completed'
            ),
            jsonb_build_object(
                'gate', 'system_stability',
                'required', 95,
                'current', 0,
                'passing', false,
                'description', 'System stability percentage'
            )
        );
        all_passing := false;
        message_text := 'Readiness gates not initialized - system is not ready';
    END IF;
    
    -- Build result
    result := jsonb_build_object(
        'allPassing', all_passing,
        'gates', gates_data,
        'message', message_text
    );
    
    RETURN result;
END;
$$;