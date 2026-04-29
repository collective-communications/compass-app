-- pgTAP — security hardening: answer writes require the matching session token.

BEGIN;
\set TAP_HELPERS_INCLUDED 1
\ir helpers/fixtures.sql
SELECT plan(3);

SELECT tests.create_test_org('security-answer-session-org') AS org_id \gset
SELECT tests.create_test_survey(:'org_id'::uuid) AS survey_id \gset
SELECT tests.create_test_deployment(:'survey_id'::uuid, true) AS dep_id \gset
SELECT tests.create_test_question(:'survey_id'::uuid, 0) AS question_id \gset

SET LOCAL ROLE postgres;
INSERT INTO public.responses (id, deployment_id, session_token, is_complete)
VALUES (
  'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa'::uuid,
  :'dep_id'::uuid,
  'own-session-token',
  false
);

SET LOCAL ROLE anon;
SELECT tests.set_anon_claim();
SELECT tests.set_session_token_header('wrong-session-token');

SELECT throws_ok(
  format(
    $sql$INSERT INTO public.answers (id, response_id, question_id, likert_value)
         VALUES ('bbbbbbbb-1111-1111-1111-bbbbbbbbbbbb'::uuid, %L::uuid, %L::uuid, 4)$sql$,
    'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa',
    :'question_id'
  ),
  '42501',
  NULL,
  'anonymous insert without matching session token is denied'
);

SELECT tests.set_session_token_header('own-session-token');

SELECT lives_ok(
  format(
    $sql$INSERT INTO public.answers (id, response_id, question_id, likert_value)
         VALUES ('cccccccc-1111-1111-1111-cccccccccccc'::uuid, %L::uuid, %L::uuid, 4)$sql$,
    'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa',
    :'question_id'
  ),
  'anonymous insert with matching session token succeeds'
);

SELECT tests.set_session_token_header('wrong-session-token');

UPDATE public.answers
   SET likert_value = 2
 WHERE id = 'cccccccc-1111-1111-1111-cccccccccccc'::uuid;

SELECT is(
  (SELECT likert_value FROM public.answers WHERE id = 'cccccccc-1111-1111-1111-cccccccccccc'::uuid),
  4,
  'anonymous update without matching session token does not modify the answer'
);

SELECT * FROM finish();
ROLLBACK;
