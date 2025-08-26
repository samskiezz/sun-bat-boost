-- Fix database schema issues for scraping and training

-- Add missing columns to scrape_progress table
ALTER TABLE IF EXISTS scrape_progress 
ADD COLUMN IF NOT EXISTS total_found INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_processed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_with_pdfs INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_parsed INTEGER DEFAULT 0;

-- Add unique constraint for products table upsert
ALTER TABLE products 
ADD CONSTRAINT IF NOT EXISTS products_manufacturer_model_unique 
UNIQUE (manufacturer_id, model);

-- Add unique constraint for manufacturers table upsert  
ALTER TABLE manufacturers
ADD CONSTRAINT IF NOT EXISTS manufacturers_name_unique
UNIQUE (name);

-- Add unique constraint for scrape_progress table upsert
ALTER TABLE scrape_progress
ADD CONSTRAINT IF NOT EXISTS scrape_progress_category_unique
UNIQUE (category);

-- Create get_product_counts_by_category function
CREATE OR REPLACE FUNCTION public.get_product_counts_by_category()
RETURNS TABLE (
    category TEXT,
    total_count BIGINT,
    active_count BIGINT,
    with_datasheet_count BIGINT,
    with_pdf_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;

-- Ensure required tables exist with proper structure
CREATE TABLE IF NOT EXISTS train_episodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    episode_number INTEGER NOT NULL,
    context JSONB NOT NULL,
    result JSONB NOT NULL,
    reward DECIMAL(10,6) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    episode_batch_start INTEGER NOT NULL,
    episode_batch_end INTEGER NOT NULL,
    avg_ocr_precision DECIMAL(10,6),
    avg_ocr_recall DECIMAL(10,6),
    avg_design_pass_rate DECIMAL(10,6),
    avg_dc_ac_ratio DECIMAL(10,6),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS readiness_gates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gate_name TEXT NOT NULL UNIQUE,
    description TEXT,
    target_value DECIMAL(10,6),
    current_value DECIMAL(10,6),
    is_passing BOOLEAN DEFAULT false,
    last_checked TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default readiness gates if they don't exist
INSERT INTO readiness_gates (gate_name, description, target_value, current_value, is_passing)
VALUES 
    ('training_episodes', 'Minimum training episodes completed', 50000, 0, false),
    ('product_coverage', 'Minimum unique products in catalog', 1000, 0, false),
    ('ocr_precision', 'OCR precision threshold', 0.85, 0, false),
    ('ocr_recall', 'OCR recall threshold', 0.80, 0, false),
    ('design_pass_rate', 'Design validation pass rate', 0.90, 0, false),
    ('pdf_processing', 'PDFs successfully processed', 500, 0, false)
ON CONFLICT (gate_name) DO NOTHING;