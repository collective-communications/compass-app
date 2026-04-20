-- pgTAP — anonymous RLS policies on `answers`
--
-- Parallel coverage for `rls_anon_responses.sql`, targeting the `answers`
-- table. The anon policies on `answers` are:
--
--   * INSERT  -> `anon_insert_answers`        (requires is_valid_response())
--   * SELECT  -> `anon_read_own_answers`      (also requires the parent
--                 response's session_token to match x-session-token, per
--                 migration 00000000000039)
--
-- Invariants exercised:
--   1. Anon CAN insert answers for a valid, in-progress response.
--   2. Anon with matching session token CAN read its own answers.
--   3. Anon CANNOT read answers attached to another session's response.
--   4. Anon CANNOT read answers when the parent response is complete
--      (is_valid_response() checks r.is_complete = false).

BEGIN;
\ir ../tests_helpers/fixtures.sql
SELECT plan(4);

-- ---------------------------------------------------------------------------
-- Fixture setup
-- ---------------------------------------------------------------------------
SELECT tests.create_test_org('anon-answers-org')    AS org_id    \gset
SELECT tests.create_test_survey(:'org_id'::uuid)    AS survey_id \gset
SELECT tests.create_test_deployment(:'survey_id'::uuid, true) AS dep_id \gset
SELECT tests.create_test_question(:'survey_id'::uuid, 0) AS question_id \gset

-- Seed two responses under the service role:
--   * own_response   — session_token 'own-session-token', is_complete=false
--   * foreign_resp   — session_token 'foreign-session-token', complete=false
-- Plus one answer row pre-inserted for the foreign response so we can
-- prove anon cannot read it.
SET LOCAL ROLE postgres;

INSERT INTO public.responses (id, deployment_id, session_token, is_complete)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, :'dep_id'::uuid, 'own-session-token', false),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, :'dep_id'::uuid, 'foreign-session-token', false);

INSERT INTO public.answers (id, response_id, question_id, likert_value)
VALUES (
  'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid,
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
  :'question_id'::uuid,
  3
);

-- ===========================================================================
-- Assertion 1: anon (with matching session_token) can INSERT an answer
-- for its own in-progress response.
-- ===========================================================================
SET LOCAL ROLE anon;
SELECT tests.set_anon_claim();
SELECT tests.set_session_token_header('own-session-token');

SELECT lives_ok(
  format(
    $sql$INSERT INTO public.answers (id, response_id, question_id, likert_value)
         VALUES ('dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid, %L::uuid, %L::uuid, 4)$sql$,
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    :'question_id'
  ),
  'anon can insert an answer for its own in-progress response'
);

-- ===========================================================================
-- Assertion 2: anon CAN SELECT its own answer (positive case for the
-- session-token binding).
-- ===========================================================================
SELECT is(
  (SELECT count(*)::int FROM public.answers
     WHERE id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid),
  1,
  'anon reads its own answer when x-session-token matches'
);

-- ===========================================================================
-- Assertion 3: anon CANNOT SELECT the answer attached to a different
-- session's response, even within the same deployment.
-- ===========================================================================
SELECT is(
  (SELECT count(*)::int FROM public.answers
     WHERE id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid),
  0,
  'anon cannot read an answer belonging to a different session'
);

-- ===========================================================================
-- Assertion 4: once a response is marked complete, is_valid_response()
-- returns false, so even the owner's answer becomes unreadable via the
-- anon RLS path. This matches the product flow: after submit, the survey
-- client has no further need to read its own answers.
-- ===========================================================================
SET LOCAL ROLE postgres;
UPDATE public.responses
   SET is_complete = true, submitted_at = now()
 WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid;

SET LOCAL ROLE anon;
SELECT tests.set_anon_claim();
SELECT tests.set_session_token_header('own-session-token');
SELECT is(
  (SELECT count(*)::int FROM public.answers
     WHERE id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid),
  0,
  'anon cannot read answers after the parent response is completed'
);

SELECT * FROM finish();
ROLLBACK;
