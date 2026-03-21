-- Review fixes: RLS policies for authenticated survey respondents,
-- archived_at columns, and batch reorder RPC.

-- ============================================================================
-- 1. Allow authenticated users to take surveys (fixes 403 when admins test)
-- ============================================================================

-- Mirror anon policies from migrations 012-015 for authenticated role.
-- Reuses the existing is_valid_deployment() and is_valid_response() functions.

CREATE POLICY "authenticated_insert_responses" ON responses FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND is_valid_deployment(deployment_id)
  );

CREATE POLICY "authenticated_read_own_responses" ON responses FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND is_valid_deployment(deployment_id)
  );

CREATE POLICY "authenticated_update_own_responses" ON responses FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND is_complete = false
    AND is_valid_deployment(deployment_id)
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND is_valid_deployment(deployment_id)
  );

CREATE POLICY "authenticated_insert_answers" ON answers FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND is_valid_response(response_id)
  );

CREATE POLICY "authenticated_read_own_answers" ON answers FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND is_valid_response(response_id)
  );

CREATE POLICY "authenticated_update_own_answers" ON answers FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND is_valid_response(response_id)
  );

-- ============================================================================
-- 2. Add archived_at columns for soft-delete support
-- ============================================================================

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE admin_notes ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- ============================================================================
-- 3. Batch reorder RPC (replaces N individual UPDATE queries)
-- ============================================================================
-- Handles the UNIQUE(survey_id, order_index) constraint by temporarily
-- shifting all affected rows to negative indices, then applying new order.

CREATE OR REPLACE FUNCTION reorder_questions(
  p_survey_id UUID,
  p_question_ids UUID[],
  p_new_orders INT[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF array_length(p_question_ids, 1) IS DISTINCT FROM array_length(p_new_orders, 1) THEN
    RAISE EXCEPTION 'question_ids and new_orders arrays must have the same length';
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
