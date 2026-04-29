-- pgTAP — security hardening: segment-question RPC masks low-n metrics.

BEGIN;
\set TAP_HELPERS_INCLUDED 1
\ir helpers/fixtures.sql
SELECT plan(4);

SELECT tests.create_test_org('security-segment-rpc-org') AS org_id \gset
SELECT tests.create_test_user(:'org_id'::uuid, 'client_manager') AS user_id \gset
SELECT tests.create_test_survey(:'org_id'::uuid) AS survey_id \gset
SELECT tests.create_test_deployment(:'survey_id'::uuid, true) AS dep_id \gset
SELECT tests.create_test_question(:'survey_id'::uuid, 0) AS question_id \gset
SELECT id AS dimension_id FROM public.dimensions WHERE code = 'clarity' \gset

SET LOCAL ROLE postgres;
INSERT INTO public.organization_settings (organization_id, client_access_enabled)
VALUES (:'org_id'::uuid, true);

INSERT INTO public.question_dimensions (question_id, dimension_id)
VALUES (:'question_id'::uuid, :'dimension_id'::uuid);

WITH inserted_responses AS (
  INSERT INTO public.responses (
    id,
    deployment_id,
    session_token,
    metadata_department,
    is_complete,
    submitted_at
  )
  SELECT
    gen_random_uuid(),
    :'dep_id'::uuid,
    'engineering-low-n-' || gs::text,
    'Engineering',
    true,
    now()
  FROM generate_series(1, 4) AS gs
  RETURNING id
)
INSERT INTO public.answers (response_id, question_id, likert_value)
SELECT id, :'question_id'::uuid, 4
  FROM inserted_responses;

SET LOCAL ROLE authenticated;
SELECT tests.set_auth_uid(:'user_id'::uuid);

SELECT is(
  (SELECT is_masked
     FROM public.get_segment_question_scores(:'survey_id'::uuid, 'department', 'Engineering')
     LIMIT 1),
  true,
  'low-n segment question row is marked masked'
);

SELECT is(
  (SELECT response_count
     FROM public.get_segment_question_scores(:'survey_id'::uuid, 'department', 'Engineering')
     LIMIT 1),
  NULL::bigint,
  'masked segment question row nulls response_count'
);

SELECT is(
  (SELECT mean_score
     FROM public.get_segment_question_scores(:'survey_id'::uuid, 'department', 'Engineering')
     LIMIT 1),
  NULL::numeric,
  'masked segment question row nulls mean_score'
);

SELECT is(
  (SELECT dist_4
     FROM public.get_segment_question_scores(:'survey_id'::uuid, 'department', 'Engineering')
     LIMIT 1),
  NULL::bigint,
  'masked segment question row nulls distribution buckets'
);

SELECT * FROM finish();
ROLLBACK;
