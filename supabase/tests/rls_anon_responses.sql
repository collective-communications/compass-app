-- pgTAP — anonymous (respondent) RLS policies on `responses`
--
-- Verifies three invariants that together enforce the "structural
-- anonymity" product guarantee for the respondent flow:
--
--   1. An anon client CAN INSERT a response row for a valid active
--      deployment (policy: `anon_insert_responses`).
--   2. An anon client CANNOT SELECT another session's response row even
--      when the deployment is valid — the `session_token` must match the
--      `x-session-token` request header (policy: `anon_read_own_responses`,
--      tightened in migration 00000000000039).
--   3. An anon client CANNOT SELECT responses belonging to a closed /
--      inactive deployment (is_valid_deployment() returns false).
--
-- All assertions run inside a single transaction and are rolled back.

BEGIN;
\set TAP_HELPERS_INCLUDED 1
\ir helpers/fixtures.sql
SELECT plan(5);

-- ---------------------------------------------------------------------------
-- Fixture setup (runs as postgres / owner — no role switch yet)
-- ---------------------------------------------------------------------------
SELECT tests.create_test_org('anon-responses-org')          AS org_id          \gset
SELECT tests.create_test_survey(:'org_id'::uuid)            AS survey_id       \gset
SELECT tests.create_test_deployment(:'survey_id'::uuid, true)  AS active_dep_id   \gset
SELECT tests.create_test_deployment(:'survey_id'::uuid, false) AS inactive_dep_id \gset

-- Pre-seed a "foreign" session's response row using the service role
-- (bypasses RLS) so we can later prove anon cannot read it.
SET LOCAL ROLE postgres;
INSERT INTO public.responses (id, deployment_id, session_token, is_complete)
VALUES (
  '11111111-1111-1111-1111-111111111111'::uuid,
  :'active_dep_id'::uuid,
  'foreign-session-token',
  false
);

-- Also seed a response against the *inactive* deployment, to prove anon
-- cannot read rows for closed deployments regardless of session token.
INSERT INTO public.responses (id, deployment_id, session_token, is_complete)
VALUES (
  '22222222-2222-2222-2222-222222222222'::uuid,
  :'inactive_dep_id'::uuid,
  'inactive-dep-token',
  false
);

-- ===========================================================================
-- Assertion 1: anon CAN insert a response for an active deployment.
-- ===========================================================================
SET LOCAL ROLE anon;
SELECT tests.set_anon_claim();
SELECT tests.set_session_token_header('own-session-token');

SELECT lives_ok(
  format(
    $sql$INSERT INTO public.responses (id, deployment_id, session_token, is_complete)
         VALUES ('33333333-3333-3333-3333-333333333333'::uuid, %L::uuid, 'own-session-token', false)$sql$,
    :'active_dep_id'
  ),
  'anon can insert a response for a valid active deployment'
);

-- ===========================================================================
-- Assertion 2: anon with the OWN session token can read the row it created.
-- This is the positive half of the session-token binding — prove the
-- binding does not over-correct and lock the legitimate respondent out.
-- ===========================================================================
SELECT is(
  (SELECT count(*)::int FROM public.responses
     WHERE id = '33333333-3333-3333-3333-333333333333'::uuid),
  1,
  'anon reads its own response when x-session-token matches'
);

-- ===========================================================================
-- Assertion 3: anon CANNOT SELECT a row inserted by a *different* anon
-- session, even though the deployment is valid. This is the headline
-- guarantee re-introduced by migration 00000000000039.
-- ===========================================================================
SELECT is(
  (SELECT count(*)::int FROM public.responses
     WHERE id = '11111111-1111-1111-1111-111111111111'::uuid),
  0,
  'anon cannot read a response with a mismatched session_token'
);

-- ===========================================================================
-- Assertion 4: swap the header to the foreign token — anon can now see
-- that specific row but still not its own. Proves the binding is based on
-- the header value, not some other happenstance.
-- ===========================================================================
SELECT tests.set_session_token_header('foreign-session-token');
SELECT is(
  (SELECT count(*)::int FROM public.responses
     WHERE id = '11111111-1111-1111-1111-111111111111'::uuid),
  1,
  'anon with matching session_token reads exactly that session''s row'
);

-- ===========================================================================
-- Assertion 5: rows attached to an inactive/closed deployment are
-- unreadable even if the session token matches, because
-- is_valid_deployment() fails.
-- ===========================================================================
SELECT tests.set_session_token_header('inactive-dep-token');
SELECT is(
  (SELECT count(*)::int FROM public.responses
     WHERE id = '22222222-2222-2222-2222-222222222222'::uuid),
  0,
  'anon cannot read responses attached to an inactive deployment'
);

SELECT * FROM finish();
ROLLBACK;
