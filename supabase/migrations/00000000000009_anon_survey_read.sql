-- Allow anonymous users to read surveys that have an active deployment.
-- Required for the survey respondent flow: after resolving the deployment token,
-- the engine needs to read the survey row to check status and dates.
CREATE POLICY "anon_read_surveys_with_active_deployment" ON surveys FOR SELECT
  USING (
    auth.role() = 'anon'
    AND EXISTS (
      SELECT 1 FROM deployments d
      WHERE d.survey_id = surveys.id
      AND d.is_active = true
    )
  );
