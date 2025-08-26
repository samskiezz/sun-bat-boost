-- Create job orchestration tables for comprehensive scraping system
CREATE TABLE IF NOT EXISTS scrape_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status TEXT NOT NULL DEFAULT 'queued',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    started_at TIMESTAMP WITH TIME ZONE,
    finished_at TIMESTAMP WITH TIME ZONE,
    error TEXT
);

CREATE TABLE IF NOT EXISTS scrape_job_progress (
    job_id UUID NOT NULL,
    category TEXT NOT NULL,
    target INTEGER NOT NULL,
    processed INTEGER NOT NULL DEFAULT 0,
    specs_done INTEGER NOT NULL DEFAULT 0,
    pdf_done INTEGER NOT NULL DEFAULT 0,
    state TEXT NOT NULL DEFAULT 'pending',
    PRIMARY KEY (job_id, category),
    FOREIGN KEY (job_id) REFERENCES scrape_jobs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_scrape_job_progress_category ON scrape_job_progress(category);
CREATE INDEX IF NOT EXISTS idx_scrape_job_progress_job_id ON scrape_job_progress(job_id);

-- Create readiness gates table
CREATE TABLE IF NOT EXISTS readiness_gates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gate_name TEXT NOT NULL UNIQUE,
    required_value DOUBLE PRECISION NOT NULL,
    current_value DOUBLE PRECISION DEFAULT 0,
    passing BOOLEAN DEFAULT false,
    details JSONB DEFAULT '{}',
    last_checked TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert initial readiness gates
INSERT INTO readiness_gates (gate_name, required_value, details) VALUES
('G0_JOB_ORCHESTRATION', 1, '{"description": "Exactly 1 completed ScrapeJob and 0 running/queued"}'),
('G1_PANEL_COVERAGE', 1348, '{"description": "Panel catalog coverage target"}'),
('G1_BATTERY_COVERAGE', 513, '{"description": "Battery module catalog coverage target"}'),
('G1_INVERTER_COVERAGE', 200, '{"description": "Inverter catalog coverage target"}'),
('G2_PANEL_PDFS', 1348, '{"description": "Panel PDF download coverage"}'),
('G2_BATTERY_PDFS', 513, '{"description": "Battery module PDF download coverage"}'),
('G2_INVERTER_PDFS', 200, '{"description": "Inverter PDF download coverage"}'),
('G3_PANEL_SPECS', 1348, '{"description": "Panel specs completeness (≥6 core specs)"}'),
('G3_BATTERY_SPECS', 513, '{"description": "Battery specs completeness (≥6 core specs)"}'),
('G3_INVERTER_SPECS', 200, '{"description": "Inverter specs completeness (≥6 core specs)"}'),
('G4_DOCSPAN_RATIO', 0.9, '{"description": "DocSpan explainability ratio ≥90%"}')
ON CONFLICT (gate_name) DO NOTHING;

-- Function to check readiness gates
CREATE OR REPLACE FUNCTION check_readiness_gates()
RETURNS JSONB AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;