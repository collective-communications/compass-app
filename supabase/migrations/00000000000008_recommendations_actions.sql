-- Add actions column to recommendations table for numbered action items per recommendation.
ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS actions JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE recommendations ADD CONSTRAINT recommendations_actions_is_array CHECK (jsonb_typeof(actions) = 'array');
