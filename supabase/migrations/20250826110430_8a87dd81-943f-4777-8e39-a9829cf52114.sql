-- Add unique constraint to specs table for proper ON CONFLICT handling
ALTER TABLE specs ADD CONSTRAINT specs_product_key_unique UNIQUE (product_id, key);