-- Configurable Likert Scale — Part 2: Widen constraints and set new default
-- (Split from migration 026 due to PostgreSQL enum transaction restriction)

-- Update default question type from 'likert_4' to 'likert'
ALTER TABLE questions ALTER COLUMN type SET DEFAULT 'likert';

-- Widen the likert_value CHECK constraint on answers to allow 1-10
ALTER TABLE answers DROP CONSTRAINT IF EXISTS answers_likert_value_check;
ALTER TABLE answers ADD CONSTRAINT answers_likert_value_check
  CHECK (likert_value >= 1 AND likert_value <= 10);

COMMENT ON COLUMN answers.likert_value IS
  'Likert response value. Range 1-N where N is the survey likert_size (stored in surveys.settings JSONB). Legacy surveys use N=4, new surveys default to N=5.';

-- Sub-dimensions within each Culture Compass dimension (21 total).
-- Foundational table for the sub-dimension data model (Wave 1).

-- Sub-dimensions table
CREATE TABLE sub_dimensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dimension_id UUID NOT NULL REFERENCES dimensions(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for dimension lookups
CREATE INDEX idx_sub_dimensions_dimension_id ON sub_dimensions(dimension_id);

-- Add optional sub-dimension FK to questions
ALTER TABLE questions
  ADD COLUMN sub_dimension_id UUID REFERENCES sub_dimensions(id) ON DELETE SET NULL;

-- Index for question-to-sub-dimension lookups
CREATE INDEX idx_questions_sub_dimension_id ON questions(sub_dimension_id);

-- RLS: readable by everyone including anon (same pattern as dimensions)
ALTER TABLE sub_dimensions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone_read_sub_dimensions" ON sub_dimensions FOR SELECT USING (true);
CREATE POLICY "ccc_admin_all_sub_dimensions" ON sub_dimensions FOR ALL USING (is_ccc_user());
