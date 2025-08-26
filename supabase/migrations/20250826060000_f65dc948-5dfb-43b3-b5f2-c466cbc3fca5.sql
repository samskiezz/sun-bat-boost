-- Fix database schema issues for scraping and training (corrected syntax)

-- Add missing columns to scrape_progress table  
ALTER TABLE scrape_progress 
ADD COLUMN IF NOT EXISTS total_found INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_processed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_with_pdfs INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_parsed INTEGER DEFAULT 0;

-- Add missing specs column to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS specs JSONB DEFAULT '{}'::jsonb;

-- Add unique constraint for products table upsert (correct syntax)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_manufacturer_model_unique') THEN
        ALTER TABLE products ADD CONSTRAINT products_manufacturer_model_unique UNIQUE (manufacturer_id, model);
    END IF;
END $$;

-- Add unique constraint for manufacturers table upsert
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'manufacturers_name_unique') THEN
        ALTER TABLE manufacturers ADD CONSTRAINT manufacturers_name_unique UNIQUE (name);
    END IF;
END $$;

-- Add unique constraint for scrape_progress table upsert
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scrape_progress_category_unique') THEN
        ALTER TABLE scrape_progress ADD CONSTRAINT scrape_progress_category_unique UNIQUE (category);
    END IF;
END $$;

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

-- Ensure required training tables exist
CREATE TABLE IF NOT EXISTS train_episodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    episode_number INTEGER NOT NULL,
    context JSONB NOT NULL,
    result JSONB NOT NULL,
    reward DECIMAL(10,6) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    mode TEXT DEFAULT 'preboot',
    metrics JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS training_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_type TEXT NOT NULL,
    value DECIMAL(10,6) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default readiness gates if they don't exist
INSERT INTO readiness_gates (gate_name, required_value, current_value, passing)
VALUES 
    ('training_episodes', 50000, 0, false),
    ('product_coverage', 1000, 0, false),
    ('ocr_precision', 0.85, 0, false),
    ('ocr_recall', 0.80, 0, false),
    ('design_pass_rate', 0.90, 0, false),
    ('pdf_processing', 500, 0, false)
ON CONFLICT (gate_name) DO NOTHING;