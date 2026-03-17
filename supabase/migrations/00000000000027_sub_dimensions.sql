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
