-- Add unique constraint on model_type to support proper upserts
-- This prevents duplicate rows and ensures upsert with onConflict works correctly
ALTER TABLE ai_model_weights 
ADD CONSTRAINT ai_model_weights_model_type_unique 
UNIQUE (model_type);

-- Create index for better performance on model_type queries
CREATE INDEX IF NOT EXISTS idx_ai_model_weights_model_type 
ON ai_model_weights(model_type);

-- Add comment for documentation
COMMENT ON CONSTRAINT ai_model_weights_model_type_unique 
ON ai_model_weights 
IS 'Ensures each model_type (e.g., advanced_training_system) can only have one row, enabling proper upsert functionality';