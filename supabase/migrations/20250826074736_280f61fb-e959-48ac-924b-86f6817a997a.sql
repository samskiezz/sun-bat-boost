-- Fix security issues by enabling RLS on new tables and creating policies

-- Enable RLS on new tables
ALTER TABLE scrape_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_job_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE readiness_gates ENABLE ROW LEVEL SECURITY;

-- Create policies for scrape_jobs (public read access for monitoring)
CREATE POLICY "Allow public read access to scrape_jobs" 
ON scrape_jobs FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert access to scrape_jobs" 
ON scrape_jobs FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update access to scrape_jobs" 
ON scrape_jobs FOR UPDATE 
USING (true);

-- Create policies for scrape_job_progress (public read access for monitoring)
CREATE POLICY "Allow public read access to scrape_job_progress" 
ON scrape_job_progress FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert access to scrape_job_progress" 
ON scrape_job_progress FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update access to scrape_job_progress" 
ON scrape_job_progress FOR UPDATE 
USING (true);

-- Create policies for readiness_gates (public read access)
CREATE POLICY "Allow public read access to readiness_gates" 
ON readiness_gates FOR SELECT 
USING (true);

CREATE POLICY "Allow public update access to readiness_gates" 
ON readiness_gates FOR UPDATE 
USING (true);

-- Fix function search path
CREATE OR REPLACE FUNCTION check_readiness_gates()
RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    gate_results JSONB := '[]';
    gate_record RECORD;
    all_passing BOOLEAN := true;
    current_val DOUBLE PRECISION;
BEGIN
    -- G0: Job orchestration
    SELECT COUNT(*) INTO current_val 
    FROM scrape_jobs 
    WHERE status = 'completed';
    
    UPDATE readiness_gates 
    SET current_value = current_val,
        passing = (current_val >= required_value AND 
                  (SELECT COUNT(*) FROM scrape_jobs WHERE status IN ('running','queued')) = 0),
        last_checked = now()
    WHERE gate_name = 'G0_JOB_ORCHESTRATION';

    -- G1: Coverage gates
    SELECT COUNT(DISTINCT id) INTO current_val FROM products WHERE category::text = 'PANEL';
    UPDATE readiness_gates SET current_value = current_val, passing = (current_val >= required_value), last_checked = now() WHERE gate_name = 'G1_PANEL_COVERAGE';

    SELECT COUNT(DISTINCT id) INTO current_val FROM products WHERE category::text = 'BATTERY_MODULE';
    UPDATE readiness_gates SET current_value = current_val, passing = (current_val >= required_value), last_checked = now() WHERE gate_name = 'G1_BATTERY_COVERAGE';

    SELECT COUNT(DISTINCT id) INTO current_val FROM products WHERE category::text = 'INVERTER';
    UPDATE readiness_gates SET current_value = current_val, passing = (current_val >= required_value), last_checked = now() WHERE gate_name = 'G1_INVERTER_COVERAGE';

    -- G2: PDF gates
    SELECT COUNT(*) INTO current_val FROM products WHERE category::text = 'PANEL' AND pdf_path IS NOT NULL;
    UPDATE readiness_gates SET current_value = current_val, passing = (current_val >= required_value), last_checked = now() WHERE gate_name = 'G2_PANEL_PDFS';

    SELECT COUNT(*) INTO current_val FROM products WHERE category::text = 'BATTERY_MODULE' AND pdf_path IS NOT NULL;
    UPDATE readiness_gates SET current_value = current_val, passing = (current_val >= required_value), last_checked = now() WHERE gate_name = 'G2_BATTERY_PDFS';

    SELECT COUNT(*) INTO current_val FROM products WHERE category::text = 'INVERTER' AND pdf_path IS NOT NULL;
    UPDATE readiness_gates SET current_value = current_val, passing = (current_val >= required_value), last_checked = now() WHERE gate_name = 'G2_INVERTER_PDFS';

    -- Collect all gate results
    FOR gate_record IN 
        SELECT gate_name, required_value, current_value, passing, details 
        FROM readiness_gates 
        ORDER BY gate_name
    LOOP
        gate_results := gate_results || jsonb_build_object(
            'gate', gate_record.gate_name,
            'required', gate_record.required_value,
            'current', gate_record.current_value,
            'passing', gate_record.passing,
            'description', COALESCE(gate_record.details->>'description', 'No description')
        );
        
        IF NOT gate_record.passing THEN
            all_passing := false;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'allPassing', all_passing,
        'gates', gate_results,
        'message', CASE 
            WHEN all_passing THEN 'All readiness gates passed - system ready'
            ELSE 'Some readiness gates failing - system not ready'
        END
    );
END;
$$;