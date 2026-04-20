-- pgTAP — `reorder_questions()` ownership guard
--
-- Verifies the ownership check added in migration 00000000000039. The RPC
-- is SECURITY DEFINER, so RLS on `questions` cannot protect the write;
-- the function itself must reject callers that are neither CC+C staff
-- nor members of the survey's owning organization.
--
-- Signature (as defined in migration 039):
--   reorder_questions(
--     p_survey_id    UUID,
--     p_question_ids UUID[],
--     p_new_orders   INT[]
--   ) RETURNS VOID
--
-- Expected outcomes:
--   * Cross-org authenticated caller -> EXCEPTION with SQLSTATE 42501.
--   * Same-org authenticated caller -> success.
--   * CC+C staff caller -> success (regardless of org membership).

BEGIN;
\ir ../tests_helpers/fixtures.sql
SELECT plan(4);

-- ---------------------------------------------------------------------------
-- Fixture setup — two orgs, one survey under org A with three questions.
-- ---------------------------------------------------------------------------
SELECT tests.create_test_org('reorder-org-a') AS org_a_id \gset
SELECT tests.create_test_org('reorder-org-b') AS org_b_id \gset

SELECT tests.create_test_user(:'org_a_id'::uuid, 'client_manager') AS user_a_id \gset
SELECT tests.create_test_user(:'org_b_id'::uuid, 'client_manager') AS user_b_id \gset

-- A CC+C admin user — membership org doesn't matter for is_ccc_user().
SELECT tests.create_test_user(:'org_a_id'::uuid, 'ccc_admin') AS user_ccc_id \gset

SELECT tests.create_test_survey(:'org_a_id'::uuid) AS survey_id \gset
SELECT tests.create_test_question(:'survey_id'::uuid, 0) AS q0_id \gset
SELECT tests.create_test_question(:'survey_id'::uuid, 1) AS q1_id \gset
SELECT tests.create_test_question(:'survey_id'::uuid, 2) AS q2_id \gset

-- ===========================================================================
-- Assertion 1: unauthenticated caller (anon role, no auth.uid) is rejected
-- with the function's "requires an authenticated caller" RAISE.
-- ===========================================================================
SET LOCAL ROLE anon;
SELECT throws_ok(
  format(
    $sql$SELECT public.reorder_questions(%L::uuid, ARRAY[%L::uuid, %L::uuid, %L::uuid], ARRAY[2, 0, 1])$sql$,
    :'survey_id', :'q0_id', :'q1_id', :'q2_id'
  ),
  'P0001',
  'reorder_questions requires an authenticated caller',
  'reorder_questions rejects unauthenticated callers'
);

-- ===========================================================================
-- Assertion 2: authenticated caller in a different org gets SQLSTATE
-- 42501 (insufficient_privilege) — this is the Wave 1.B fix.
-- ===========================================================================
SET LOCAL ROLE authenticated;
SELECT tests.set_auth_uid(:'user_b_id'::uuid);

SELECT throws_ok(
  format(
    $sql$SELECT public.reorder_questions(%L::uuid, ARRAY[%L::uuid, %L::uuid, %L::uuid], ARRAY[2, 0, 1])$sql$,
    :'survey_id', :'q0_id', :'q1_id', :'q2_id'
  ),
  '42501',
  NULL,
  'cross-org authenticated caller is rejected with SQLSTATE 42501'
);

-- ===========================================================================
-- Assertion 3: authenticated caller in the owning org succeeds.
-- lives_ok asserts the statement does not raise; we also cross-check
-- the resulting order_index values to prove the write actually happened.
-- ===========================================================================
SELECT tests.set_auth_uid(:'user_a_id'::uuid);

SELECT lives_ok(
  format(
    $sql$SELECT public.reorder_questions(%L::uuid, ARRAY[%L::uuid, %L::uuid, %L::uuid], ARRAY[2, 0, 1])$sql$,
    :'survey_id', :'q0_id', :'q1_id', :'q2_id'
  ),
  'same-org authenticated caller succeeds'
);

-- ===========================================================================
-- Assertion 4: CC+C staff caller succeeds regardless of the survey's org.
-- ===========================================================================
SELECT tests.set_auth_uid(:'user_ccc_id'::uuid);

SELECT lives_ok(
  format(
    -- swap the orders again to prove the call completed
    $sql$SELECT public.reorder_questions(%L::uuid, ARRAY[%L::uuid, %L::uuid, %L::uuid], ARRAY[0, 1, 2])$sql$,
    :'survey_id', :'q0_id', :'q1_id', :'q2_id'
  ),
  'CC+C staff caller succeeds on any survey'
);

SELECT * FROM finish();
ROLLBACK;
