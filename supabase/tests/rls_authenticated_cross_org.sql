-- pgTAP — authenticated-role cross-organization isolation
--
-- The core tenant-isolation claim: a signed-in user belonging to org A
-- cannot read any per-tenant data (surveys, deployments, responses,
-- answers) belonging to org B.
--
-- Policies under test:
--   * `client_read_own_surveys`      (surveys.organization_id)
--   * `client_read_own_deployments`  (deployments.survey_id → surveys)
--   * `authenticated_read_own_responses`  (requires session_token match,
--       so cross-org users never see responses regardless of header)
--   * `ccc_read_answers` / `ccc_read_responses` are *not* available to
--       client roles — only CC+C staff can read raw response/answer rows.
--
-- We test both directions (A→B and B→A) to ensure the isolation is
-- symmetric, not accidentally one-way.

BEGIN;
\set TAP_HELPERS_INCLUDED 1
\ir helpers/fixtures.sql
SELECT plan(8);

-- ---------------------------------------------------------------------------
-- Org A fixtures
-- ---------------------------------------------------------------------------
SELECT tests.create_test_org('cross-org-a') AS org_a_id \gset
SELECT tests.create_test_user(:'org_a_id'::uuid, 'client_manager') AS user_a_id \gset
SELECT tests.create_test_survey(:'org_a_id'::uuid) AS survey_a_id \gset
SELECT tests.create_test_deployment(:'survey_a_id'::uuid, true) AS dep_a_id \gset

-- Org B fixtures
SELECT tests.create_test_org('cross-org-b') AS org_b_id \gset
SELECT tests.create_test_user(:'org_b_id'::uuid, 'client_manager') AS user_b_id \gset
SELECT tests.create_test_survey(:'org_b_id'::uuid) AS survey_b_id \gset
SELECT tests.create_test_deployment(:'survey_b_id'::uuid, true) AS dep_b_id \gset

-- Seed one response + one answer per deployment with a known session_token.
SET LOCAL ROLE postgres;

INSERT INTO public.responses (id, deployment_id, session_token, is_complete)
VALUES
  ('00000000-0000-0000-0000-00000000000a'::uuid, :'dep_a_id'::uuid, 'token-a', true),
  ('00000000-0000-0000-0000-00000000000b'::uuid, :'dep_b_id'::uuid, 'token-b', true);

-- Seed one question per survey so we can seed answers.
SELECT tests.create_test_question(:'survey_a_id'::uuid, 0) AS qa_id \gset
SELECT tests.create_test_question(:'survey_b_id'::uuid, 0) AS qb_id \gset

INSERT INTO public.answers (id, response_id, question_id, likert_value)
VALUES
  ('10000000-0000-0000-0000-00000000000a'::uuid,
    '00000000-0000-0000-0000-00000000000a'::uuid, :'qa_id'::uuid, 3),
  ('10000000-0000-0000-0000-00000000000b'::uuid,
    '00000000-0000-0000-0000-00000000000b'::uuid, :'qb_id'::uuid, 3);

-- ===========================================================================
-- User A scope: should see org A's surveys/deployments and NOT org B's.
-- Responses and answers are service-role / CC+C-only for client users,
-- so user A should see zero rows on both tables.
-- ===========================================================================
SET LOCAL ROLE authenticated;
SELECT tests.set_auth_uid(:'user_a_id'::uuid);

SELECT is(
  (SELECT count(*)::int FROM public.surveys WHERE id = :'survey_a_id'::uuid),
  1,
  'user in org A sees org A''s own survey'
);

SELECT is(
  (SELECT count(*)::int FROM public.surveys WHERE id = :'survey_b_id'::uuid),
  0,
  'user in org A cannot see org B''s survey'
);

SELECT is(
  (SELECT count(*)::int FROM public.deployments WHERE id = :'dep_b_id'::uuid),
  0,
  'user in org A cannot see org B''s deployments'
);

SELECT is(
  (SELECT count(*)::int FROM public.responses
     WHERE id = '00000000-0000-0000-0000-00000000000b'::uuid),
  0,
  'user in org A cannot see org B''s responses'
);

SELECT is(
  (SELECT count(*)::int FROM public.answers
     WHERE id = '10000000-0000-0000-0000-00000000000b'::uuid),
  0,
  'user in org A cannot see org B''s answers'
);

-- ===========================================================================
-- User B scope — mirror checks to ensure isolation is symmetric.
-- ===========================================================================
SELECT tests.set_auth_uid(:'user_b_id'::uuid);

SELECT is(
  (SELECT count(*)::int FROM public.surveys WHERE id = :'survey_a_id'::uuid),
  0,
  'user in org B cannot see org A''s survey'
);

SELECT is(
  (SELECT count(*)::int FROM public.deployments WHERE id = :'dep_a_id'::uuid),
  0,
  'user in org B cannot see org A''s deployments'
);

SELECT is(
  (SELECT count(*)::int FROM public.responses
     WHERE id = '00000000-0000-0000-0000-00000000000a'::uuid),
  0,
  'user in org B cannot see org A''s responses'
);

SELECT * FROM finish();
ROLLBACK;
