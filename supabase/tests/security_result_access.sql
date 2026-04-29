-- pgTAP — security hardening: result surfaces enforce org membership and client access.

BEGIN;
\set TAP_HELPERS_INCLUDED 1
\ir helpers/fixtures.sql
SELECT plan(5);

SELECT tests.create_test_org('security-results-a') AS org_a_id \gset
SELECT tests.create_test_user(:'org_a_id'::uuid, 'client_manager') AS user_a_id \gset
SELECT tests.create_test_survey(:'org_a_id'::uuid) AS survey_a_id \gset

SELECT tests.create_test_org('security-results-b') AS org_b_id \gset
SELECT tests.create_test_user(:'org_b_id'::uuid, 'client_manager') AS user_b_id \gset
SELECT tests.create_test_survey(:'org_b_id'::uuid) AS survey_b_id \gset
SELECT tests.create_test_deployment(:'survey_b_id'::uuid, true) AS dep_b_id \gset
SELECT tests.create_test_question(:'survey_b_id'::uuid, 0) AS question_b_id \gset

SET LOCAL ROLE postgres;
INSERT INTO public.organization_settings (organization_id, client_access_enabled)
VALUES
  (:'org_a_id'::uuid, true),
  (:'org_b_id'::uuid, true);

SELECT id AS dimension_id
  FROM public.dimensions
 ORDER BY display_order
 LIMIT 1 \gset

INSERT INTO public.scores (
  survey_id,
  dimension_id,
  segment_type,
  segment_value,
  score,
  raw_score,
  response_count
) VALUES (
  :'survey_b_id'::uuid,
  :'dimension_id'::uuid,
  'overall',
  'overall',
  80,
  4,
  6
);

INSERT INTO public.responses (
  id,
  deployment_id,
  session_token,
  metadata_department,
  is_complete,
  submitted_at
) VALUES (
  'aaaaaaaa-2222-2222-2222-aaaaaaaaaaaa'::uuid,
  :'dep_b_id'::uuid,
  'session-b',
  'Engineering',
  true,
  now()
);

INSERT INTO public.answers (id, response_id, question_id, likert_value)
VALUES (
  'bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb'::uuid,
  'aaaaaaaa-2222-2222-2222-aaaaaaaaaaaa'::uuid,
  :'question_b_id'::uuid,
  4
);

SET LOCAL ROLE authenticated;
SELECT tests.set_auth_uid(:'user_a_id'::uuid);

SELECT is(
  (SELECT count(*)::int FROM public.safe_segment_scores WHERE survey_id = :'survey_b_id'::uuid),
  0,
  'client in org A cannot read org B safe segment scores'
);

SELECT throws_ok(
  format($sql$SELECT public.get_response_metrics(%L::uuid)$sql$, :'survey_b_id'),
  '42501',
  NULL,
  'client in org A cannot invoke metrics RPC for org B survey'
);

SELECT tests.set_auth_uid(:'user_b_id'::uuid);

SELECT is(
  (SELECT count(*)::int FROM public.safe_segment_scores WHERE survey_id = :'survey_b_id'::uuid),
  1,
  'client in org B can read own result scores while client access is enabled'
);

SET LOCAL ROLE postgres;
UPDATE public.organization_settings
   SET client_access_enabled = false
 WHERE organization_id = :'org_b_id'::uuid;

SET LOCAL ROLE authenticated;
SELECT tests.set_auth_uid(:'user_b_id'::uuid);

SELECT is(
  (SELECT count(*)::int FROM public.safe_segment_scores WHERE survey_id = :'survey_b_id'::uuid),
  0,
  'client in org B cannot read own result scores after client access is disabled'
);

SELECT throws_ok(
  format($sql$SELECT public.get_segment_question_scores(%L::uuid, 'department', 'Engineering')$sql$, :'survey_b_id'),
  '42501',
  NULL,
  'disabled client access also blocks segment question RPC'
);

SELECT * FROM finish();
ROLLBACK;
