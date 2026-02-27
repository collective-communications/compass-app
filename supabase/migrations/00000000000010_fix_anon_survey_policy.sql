-- Fix: the previous policy caused infinite recursion (surveys → deployments → surveys).
-- Replace with a simpler check that doesn't reference the deployments table.
DROP POLICY IF EXISTS "anon_read_surveys_with_active_deployment" ON surveys;

CREATE POLICY "anon_read_active_surveys" ON surveys FOR SELECT
  USING (
    auth.role() = 'anon'
    AND status IN ('active', 'closed')
  );
