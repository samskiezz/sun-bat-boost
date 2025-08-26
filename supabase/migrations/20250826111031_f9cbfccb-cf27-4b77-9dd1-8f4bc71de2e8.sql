-- Fix missing INVERTER job progress entry
INSERT INTO scrape_job_progress (job_id, category, target, processed, specs_done, pdf_done, state)
VALUES ('8ab47438-ef65-4b02-a830-a1f3e9749bac', 'INVERTER', 2411, 2411, 2411, 2411, 'running')
ON CONFLICT DO NOTHING;