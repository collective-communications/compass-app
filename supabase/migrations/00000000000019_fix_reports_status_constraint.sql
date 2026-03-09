-- Fix reports status CHECK constraint to include all lifecycle states.
-- Original only allowed ('generating', 'ready', 'failed').
-- Adding 'queued' (initial insert) and 'completed' (generation done).

ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_status_check;

ALTER TABLE reports
  ADD CONSTRAINT reports_status_check
  CHECK (status IN ('queued', 'generating', 'ready', 'completed', 'failed'));
