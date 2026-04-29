-- pgTAP — security hardening: answers are bound to their response survey.

BEGIN;
\set TAP_HELPERS_INCLUDED 1
\ir helpers/fixtures.sql
SELECT plan(4);

SELECT tests.create_test_org('security-answer-survey-org') AS org_id \gset
SELECT tests.create_test_survey(:'org_id'::uuid) AS survey_a_id \gset
SELECT tests.create_test_survey(:'org_id'::uuid) AS survey_b_id \gset
SELECT tests.create_test_deployment(:'survey_a_id'::uuid, true) AS dep_a_id \gset
SELECT tests.create_test_question(:'survey_a_id'::uuid, 0) AS question_a_id \gset
SELECT tests.create_test_question(:'survey_b_id'::uuid, 0) AS question_b_id \gset

SET LOCAL ROLE postgres;
INSERT INTO public.responses (id, deployment_id, session_token, is_complete)
VALUES (
  'aaaaaaaa-5555-5555-5555-aaaaaaaaaaaa'::uuid,
  :'dep_a_id'::uuid,
  'answer-survey-token',
  false
);

SET LOCAL ROLE anon;
SELECT tests.set_anon_claim();
SELECT tests.set_session_token_header('answer-survey-token');

SELECT lives_ok(
  format(
    $sql$INSERT INTO public.answers (id, response_id, question_id, likert_value)
         VALUES ('bbbbbbbb-5555-5555-5555-bbbbbbbbbbbb'::uuid, %L::uuid, %L::uuid, 4)$sql$,
    'aaaaaaaa-5555-5555-5555-aaaaaaaaaaaa',
    :'question_a_id'
  ),
  'anonymous answer insert succeeds when response and question share a survey'
);

SELECT throws_ok(
  format(
    $sql$INSERT INTO public.answers (id, response_id, question_id, likert_value)
         VALUES ('cccccccc-5555-5555-5555-cccccccccccc'::uuid, %L::uuid, %L::uuid, 4)$sql$,
    'aaaaaaaa-5555-5555-5555-aaaaaaaaaaaa',
    :'question_b_id'
  ),
  '23514',
  NULL,
  'anonymous answer insert is denied when question belongs to another survey'
);

SET LOCAL ROLE postgres;

SELECT is(
  public.answer_matches_response_survey(
    'aaaaaaaa-5555-5555-5555-aaaaaaaaaaaa'::uuid,
    :'question_b_id'::uuid
  ),
  false,
  'ownership helper detects cross-survey response/question pairs'
);

SELECT throws_ok(
  format(
    $sql$UPDATE public.answers
            SET question_id = %L::uuid
          WHERE id = 'bbbbbbbb-5555-5555-5555-bbbbbbbbbbbb'::uuid$sql$,
    :'question_b_id'
  ),
  '23514',
  NULL,
  'database trigger prevents privileged cross-survey answer mutation'
);

SELECT * FROM finish();
ROLLBACK;
