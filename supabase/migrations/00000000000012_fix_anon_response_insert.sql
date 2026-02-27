-- Fix: the original anon_insert_responses policy's subquery fails during INSERT
-- because PostgreSQL evaluates RLS on joined tables in WITH CHECK differently.
-- Use a SECURITY DEFINER function to bypass RLS for the deployment validation check.

CREATE OR REPLACE FUNCTION is_valid_deployment(dep_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM deployments d
    JOIN surveys s ON s.id = d.survey_id
    WHERE d.id = dep_id
      AND d.is_active = true
      AND s.status = 'active'
      AND (d.closes_at IS NULL OR d.closes_at > now())
  );
$$;

DROP POLICY IF EXISTS "anon_insert_responses" ON responses;

CREATE POLICY "anon_insert_responses" ON responses FOR INSERT
  WITH CHECK (
    auth.role() = 'anon'
    AND is_valid_deployment(deployment_id)
  );
