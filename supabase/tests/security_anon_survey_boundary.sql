-- pgTAP — security hardening: anonymous survey access is token-bound.

BEGIN;
\set TAP_HELPERS_INCLUDED 1
\ir helpers/fixtures.sql
SELECT plan(5);

SELECT tests.create_test_org('security-anon-survey-org') AS org_id \gset
SELECT tests.create_test_survey(:'org_id'::uuid) AS survey_id \gset
SELECT tests.create_test_deployment(:'survey_id'::uuid, true) AS dep_id \gset
SELECT tests.create_test_question(:'survey_id'::uuid, 0) AS question_id \gset

SET LOCAL ROLE postgres;
SELECT token::text AS dep_token
  FROM public.deployments
 WHERE id = :'dep_id'::uuid \gset

SET LOCAL ROLE anon;
SELECT tests.set_anon_claim();

SELECT is(
  (SELECT count(*)::int FROM public.deployments WHERE id = :'dep_id'::uuid),
  0,
  'anonymous caller cannot enumerate active deployments directly'
);

SELECT is(
  (SELECT count(*)::int FROM public.surveys WHERE id = :'survey_id'::uuid),
  0,
  'anonymous caller cannot enumerate active surveys directly'
);

SELECT is(
  (SELECT count(*)::int FROM public.questions WHERE survey_id = :'survey_id'::uuid),
  0,
  'anonymous caller cannot enumerate active survey questions directly'
);

SELECT ok(
  public.resolve_deployment_by_token(:'dep_token') IS NOT NULL,
  'valid deployment token resolves through the token-bound RPC'
);

SELECT is(
  (
    SELECT count(*)::int
      FROM public.get_questions_for_deployment_token(:'dep_token', :'survey_id'::uuid)
  ),
  1,
  'valid deployment token loads only the linked survey questions through RPC'
);

SELECT * FROM finish();
ROLLBACK;
