-- Add client_access_enabled flag to organizations.
-- When false, client_* roles cannot access results or reports for this org.
-- Toggled by CC+C admin from the client detail page.

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS client_access_enabled BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN organizations.client_access_enabled IS
  'When false, client roles cannot access results or reports. Controlled by CC+C admin.';

-- Add RLS policy on reports table for client access gating.
-- Client roles can only read completed reports for their org when:
--   1. org-level client_access_enabled = true
--   2. per-report client_visible = true

DO $$
BEGIN
  -- Drop existing client read policy if it exists (safe idempotent migration)
  DROP POLICY IF EXISTS reports_client_read ON reports;

  -- Client roles can only read reports for their org when access is enabled
  CREATE POLICY reports_client_read ON reports FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM org_members om
        JOIN organizations o ON o.id = om.organization_id
        WHERE om.user_id = auth.uid()
        AND o.id = reports.organization_id
        AND o.client_access_enabled = true
      )
      AND client_visible = true
      AND status IN ('ready', 'completed')
    );
END $$;
