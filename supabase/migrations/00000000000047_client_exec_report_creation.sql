-- Let client_exec users create report generation requests for their own
-- organization while keeping report reads gated by client-access settings.
--
-- Earlier migrations left two client SELECT policies in place: the original
-- ungated policy and a later gated policy with a different name. PostgreSQL
-- ORs permissive policies, so the ungated policy won. Replace both with one
-- policy that matches the app's route guard source of truth:
-- organization_settings.client_access_enabled.

DROP POLICY IF EXISTS "client_read_visible_reports" ON reports;
DROP POLICY IF EXISTS reports_client_read ON reports;
DROP POLICY IF EXISTS reports_client_exec_insert ON reports;

CREATE POLICY reports_client_read ON reports FOR SELECT
  USING (
    client_visible = true
    AND EXISTS (
      SELECT 1
      FROM org_members om
      JOIN organization_settings os ON os.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
        AND om.organization_id = reports.organization_id
        AND os.client_access_enabled = true
    )
  );

CREATE POLICY reports_client_exec_insert ON reports FOR INSERT
  WITH CHECK (
    client_visible = true
    AND status = 'queued'
    AND progress = 0
    AND storage_path IS NULL
    AND file_size IS NULL
    AND page_count IS NULL
    AND error IS NULL
    AND created_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM org_members om
      JOIN organization_settings os ON os.organization_id = om.organization_id
      JOIN surveys s ON s.id = reports.survey_id
      WHERE om.user_id = auth.uid()
        AND om.role = 'client_exec'::user_role
        AND s.organization_id = om.organization_id
        AND reports.organization_id = om.organization_id
        AND os.client_access_enabled = true
    )
  );
