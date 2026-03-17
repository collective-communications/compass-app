-- Configurable Likert Scale (Wave 1)
-- Adds 'likert' to question_type enum and widens the likert_value constraint
-- to support scales from 2-10 points. Keeps 'likert_4' for backward compat.

-- 1. Add 'likert' to the question_type enum (non-destructive, keeps 'likert_4')
ALTER TYPE question_type ADD VALUE IF NOT EXISTS 'likert';

-- 2. Update default question type on questions table from 'likert_4' to 'likert'
ALTER TABLE questions ALTER COLUMN type SET DEFAULT 'likert';

-- 3. Widen the likert_value CHECK constraint on answers to allow 1-10
-- Drop the existing constraint and add a wider one
ALTER TABLE answers DROP CONSTRAINT IF EXISTS answers_likert_value_check;
ALTER TABLE answers ADD CONSTRAINT answers_likert_value_check
  CHECK (likert_value >= 1 AND likert_value <= 10);

-- 4. Add comment documenting the change
COMMENT ON COLUMN answers.likert_value IS
  'Likert response value. Range 1-N where N is the survey likert_size (stored in surveys.settings JSONB). Legacy surveys use N=4, new surveys default to N=5.';
