-- Align reports table with the application code.
-- Original schema (migration 003) had: id, survey_id, organization_id, title,
-- status, storage_path, client_visible, triggered_by, created_at, updated_at.
-- The report-api.ts code expects additional columns and inserts without
-- title/triggered_by. This migration reconciles the two.

-- 1. Add columns the application code reads and writes
ALTER TABLE reports ADD COLUMN IF NOT EXISTS format TEXT NOT NULL DEFAULT 'pdf';
ALTER TABLE reports ADD COLUMN IF NOT EXISTS progress INT NOT NULL DEFAULT 0;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS file_size INT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS page_count INT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS sections TEXT[] DEFAULT '{}';
ALTER TABLE reports ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS error TEXT;

-- 2. Relax NOT NULL on legacy columns the new code doesn't insert
ALTER TABLE reports ALTER COLUMN title DROP NOT NULL;
ALTER TABLE reports ALTER COLUMN title SET DEFAULT '';
ALTER TABLE reports ALTER COLUMN triggered_by DROP NOT NULL;
ALTER TABLE reports ALTER COLUMN triggered_by SET DEFAULT '';

-- 3. Auto-populate organization_id from survey on insert so the frontend
--    doesn't need to pass it (and RLS policies still work).
CREATE OR REPLACE FUNCTION set_report_organization_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM surveys
    WHERE id = NEW.survey_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Allow nullable insert (trigger fills it in)
ALTER TABLE reports ALTER COLUMN organization_id DROP NOT NULL;

CREATE TRIGGER reports_set_org_id
  BEFORE INSERT ON reports
  FOR EACH ROW EXECUTE FUNCTION set_report_organization_id();

-- 4. Add CHECK on format column
ALTER TABLE reports ADD CONSTRAINT reports_format_check
  CHECK (format IN ('pdf', 'pptx'));
