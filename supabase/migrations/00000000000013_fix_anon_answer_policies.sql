-- Fix anon answer policies to use SECURITY DEFINER functions
-- instead of RLS subqueries that fail in WITH CHECK context.

-- Helper: check if a response belongs to an active deployment
CREATE OR REPLACE FUNCTION is_valid_response(resp_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM responses r
    JOIN deployments d ON d.id = r.deployment_id
    WHERE r.id = resp_id
      AND d.is_active = true
      AND r.is_complete = false
  );
$$;

-- Replace anon_insert_answers: allow inserting answers for valid in-progress responses
DROP POLICY IF EXISTS "anon_insert_answers" ON answers;
CREATE POLICY "anon_insert_answers" ON answers FOR INSERT
  WITH CHECK (
    auth.role() = 'anon'
    AND is_valid_response(response_id)
  );

-- Replace anon_read_own_answers: allow reading answers for own responses
DROP POLICY IF EXISTS "anon_read_own_answers" ON answers;
CREATE POLICY "anon_read_own_answers" ON answers FOR SELECT
  USING (
    auth.role() = 'anon'
    AND is_valid_response(response_id)
  );

-- Replace anon_read_own_responses: simplify to check deployment is active
DROP POLICY IF EXISTS "anon_read_own_responses" ON responses;
CREATE POLICY "anon_read_own_responses" ON responses FOR SELECT
  USING (
    auth.role() = 'anon'
    AND is_valid_deployment(deployment_id)
  );

-- Replace anon_update_own_responses: allow marking response complete
DROP POLICY IF EXISTS "anon_update_own_responses" ON responses;
CREATE POLICY "anon_update_own_responses" ON responses FOR UPDATE
  USING (
    auth.role() = 'anon'
    AND is_complete = false
    AND is_valid_deployment(deployment_id)
  );
