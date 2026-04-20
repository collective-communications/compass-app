-- RLS Session-Token Fix
--
-- Three tightening changes to existing policies/functions:
--
-- 1. `anon_read_own_responses` / `anon_read_own_answers` lost their
--    `session_token = request.header(x-session-token)` predicate in migration
--    00000000000013 when the policies were simplified to use
--    `is_valid_deployment()`. That accidentally lets any anonymous client who
--    knows any valid deployment id read every row on the table. Restore the
--    session-token binding so each anon session only sees its own response.
--
-- 2. `authenticated_read_own_responses` / `authenticated_read_own_answers`
--    (added in migration 00000000000030) had the same oversight. Apply the
--    same session-token binding so a signed-in tester cannot read other
--    respondents' data just by knowing the deployment id.
--
-- 3. `reorder_questions` runs with SECURITY DEFINER and does no caller-
--    ownership check — any authenticated user who can invoke RPCs can
--    reorder any survey's questions. Add an ownership guard that requires
--    the caller to be CC+C staff or a member of the owning organization.
--
-- 4. `auth_user_role()` / `auth_user_org_id()` select from `org_members`
--    with `LIMIT 1` and no ordering. When a user has multiple memberships
--    (e.g. CC+C staff assigned to multiple client orgs for testing) the
--    selected row is non-deterministic, which makes RLS decisions flap
--    between queries. Pin the selection to the oldest membership.

-- ============================================================================
-- 1 & 2. Session-token bindings for response/answer read policies
-- ============================================================================

-- Responses (anon) — require the deployment is valid AND the session_token
-- matches the `x-session-token` request header set by the survey client.
DROP POLICY IF EXISTS "anon_read_own_responses" ON responses;
CREATE POLICY "anon_read_own_responses" ON responses FOR SELECT
  USING (
    auth.role() = 'anon'
    AND is_valid_deployment(deployment_id)
    AND session_token = current_setting('request.headers', true)::json->>'x-session-token'
  );

-- Answers (anon) — same session-token binding, resolved through the parent
-- response row so we keep the `is_valid_response()` helper's deployment check.
DROP POLICY IF EXISTS "anon_read_own_answers" ON answers;
CREATE POLICY "anon_read_own_answers" ON answers FOR SELECT
  USING (
    auth.role() = 'anon'
    AND is_valid_response(response_id)
    AND response_id IN (
      SELECT r.id FROM responses r
      WHERE r.session_token = current_setting('request.headers', true)::json->>'x-session-token'
    )
  );

-- Responses (authenticated) — mirror of the anon policy so signed-in test
-- runs also stay scoped to the caller's own session.
DROP POLICY IF EXISTS "authenticated_read_own_responses" ON responses;
CREATE POLICY "authenticated_read_own_responses" ON responses FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND is_valid_deployment(deployment_id)
    AND session_token = current_setting('request.headers', true)::json->>'x-session-token'
  );

-- Answers (authenticated) — same binding.
DROP POLICY IF EXISTS "authenticated_read_own_answers" ON answers;
CREATE POLICY "authenticated_read_own_answers" ON answers FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND is_valid_response(response_id)
    AND response_id IN (
      SELECT r.id FROM responses r
      WHERE r.session_token = current_setting('request.headers', true)::json->>'x-session-token'
    )
  );

-- ============================================================================
-- 3. Ownership check on reorder_questions RPC
-- ============================================================================

-- The RPC is SECURITY DEFINER, so we cannot rely on RLS to filter access.
-- Instead, verify that the calling user is CC+C staff (which is_ccc_user()
-- covers) OR is a member of the organization that owns the survey. Any
-- other caller — including a signed-in client user from a different org —
-- gets an exception and the reorder is rolled back.

CREATE OR REPLACE FUNCTION reorder_questions(
  p_survey_id UUID,
  p_question_ids UUID[],
  p_new_orders INT[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id UUID;
  v_caller UUID := auth.uid();
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'reorder_questions requires an authenticated caller';
  END IF;

  IF array_length(p_question_ids, 1) IS DISTINCT FROM array_length(p_new_orders, 1) THEN
    RAISE EXCEPTION 'question_ids and new_orders arrays must have the same length';
  END IF;

  -- Resolve the survey's owning organization once.
  SELECT s.organization_id
    INTO v_org_id
    FROM surveys s
   WHERE s.id = p_survey_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Survey % not found', p_survey_id;
  END IF;

  -- Allow CC+C staff or a member of the owning organization. Anyone else
  -- should not be able to mutate the question order.
  IF NOT (
    is_ccc_user()
    OR EXISTS (
      SELECT 1 FROM org_members
       WHERE user_id = v_caller
         AND organization_id = v_org_id
    )
  ) THEN
    RAISE EXCEPTION 'Caller % is not permitted to reorder questions on survey %',
      v_caller, p_survey_id
      USING ERRCODE = '42501'; -- insufficient_privilege
  END IF;

  -- Step 1: move affected rows to negative indices to avoid unique constraint violations
  UPDATE questions
     SET order_index = -(order_index + 1000000)
   WHERE survey_id = p_survey_id
     AND id = ANY(p_question_ids);

  -- Step 2: apply the new order values
  FOR i IN 1..array_length(p_question_ids, 1) LOOP
    UPDATE questions
       SET order_index = p_new_orders[i]
     WHERE id = p_question_ids[i]
       AND survey_id = p_survey_id;
  END LOOP;
END;
$$;

-- ============================================================================
-- 4. Deterministic helper selection
-- ============================================================================

-- A user's effective role/org is derived from their oldest membership, so
-- the result is stable regardless of subsequent invitations. The ASC order
-- on (created_at, id) also breaks ties for rows inserted in the same tick.

CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS user_role AS $$
  SELECT role FROM org_members
   WHERE user_id = auth.uid()
   ORDER BY created_at ASC, id ASC
   LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION auth_user_org_id()
RETURNS UUID AS $$
  SELECT organization_id FROM org_members
   WHERE user_id = auth.uid()
   ORDER BY created_at ASC, id ASC
   LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;
