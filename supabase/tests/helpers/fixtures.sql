-- Shared fixture helpers for the pgTAP RLS test suite.
--
-- This file is `\ir`-included at the top of every test file. It is
-- intentionally *not* a pgTAP test itself — no `plan()` / `finish()` —
-- and it lives under `helpers/` so Supabase CLI's top-level glob
-- (`supabase/tests/*.sql`) does not pick it up as a test.
--
-- Each helper inserts a minimal-valid row and returns the new id. Helpers
-- are SECURITY DEFINER so tests running under `anon` / `authenticated` can
-- call them to seed data without tripping RLS on the fixture inserts.
--
-- All helpers live in the `tests` schema. Test files invoke them by
-- fully-qualified name (e.g. `SELECT tests.create_test_org('foo')`) so the
-- search_path inside test transactions does not leak fixture helpers into
-- the normal application namespace.

-- pgTAP must be installed before the assertion functions (`plan`, `ok`,
-- `is`, `throws_ok`, etc.) are resolvable. Idempotent — safe to run
-- once per test.
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

-- Make pgTAP assertions resolvable without the `extensions.` prefix.
SET search_path = extensions, public, tests;

CREATE SCHEMA IF NOT EXISTS tests;

-- ---------------------------------------------------------------------------
-- create_test_org(name TEXT) -> UUID
--
-- Inserts an organization with a slug derived from the name + a random suffix
-- (so repeated calls in one transaction do not collide on the UNIQUE slug).
-- The settings JSON includes `anonymityThreshold: 5` to match the default
-- used by the `safe_segment_scores` view.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION tests.create_test_org(p_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID := gen_random_uuid();
  v_slug TEXT := lower(regexp_replace(p_name, '[^a-zA-Z0-9]+', '-', 'g'))
                 || '-' || substr(v_id::text, 1, 8);
BEGIN
  INSERT INTO public.organizations (id, name, slug, settings)
  VALUES (v_id, p_name, v_slug, '{"anonymityThreshold": 5}'::jsonb);
  RETURN v_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- create_test_user(org_id UUID, role TEXT) -> UUID
--
-- Inserts a row into `auth.users` and attaches the user to the given
-- organization with the given role via `org_members`. The role arg is
-- cast to `user_role` so callers pass the enum's string values
-- ('ccc_admin', 'ccc_member', 'client_exec', ...).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION tests.create_test_user(p_org_id UUID, p_role TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID := gen_random_uuid();
  v_email TEXT := 'test-' || substr(v_id::text, 1, 8) || '@example.test';
BEGIN
  -- Minimal auth.users row. We intentionally skip optional columns (last
  -- sign-in, confirmation tokens, etc.) — RLS checks only need the id.
  INSERT INTO auth.users (
    id, email, aud, role,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) VALUES (
    v_id, v_email, 'authenticated', 'authenticated',
    '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  );

  INSERT INTO public.org_members (organization_id, user_id, role)
  VALUES (p_org_id, v_id, p_role::public.user_role);

  RETURN v_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- create_test_survey(org_id UUID) -> UUID
--
-- Inserts a survey in `active` status so the anon response policies
-- (`is_valid_deployment()` requires `s.status = 'active'`) will accept
-- inserts against its deployments.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION tests.create_test_survey(p_org_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID := gen_random_uuid();
BEGIN
  INSERT INTO public.surveys (id, organization_id, title, status)
  VALUES (v_id, p_org_id, 'pgTAP test survey', 'active');
  RETURN v_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- create_test_deployment(survey_id UUID, is_active BOOLEAN DEFAULT true)
--   -> UUID
--
-- Inserts a deployment. `is_valid_deployment()` additionally checks that
-- the deployment's `closes_at` is NULL or in the future, so we leave
-- `closes_at` NULL by default.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION tests.create_test_deployment(
  p_survey_id UUID,
  p_is_active BOOLEAN DEFAULT true
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID := gen_random_uuid();
BEGIN
  INSERT INTO public.deployments (id, survey_id, is_active)
  VALUES (v_id, p_survey_id, p_is_active);
  RETURN v_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- create_test_question(survey_id UUID, order_index INT) -> UUID
--
-- Helper for the reorder_questions ownership test. Inserts a likert question.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION tests.create_test_question(
  p_survey_id UUID,
  p_order_index INT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID := gen_random_uuid();
BEGIN
  INSERT INTO public.questions (id, survey_id, text, type, order_index)
  VALUES (
    v_id,
    p_survey_id,
    'Test question ' || p_order_index,
    'likert'::public.question_type,
    p_order_index
  );
  RETURN v_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- set_auth_uid(uid UUID) -> VOID
--
-- Convenience wrapper that stuffs a user id into the `request.jwt.claims`
-- GUC. `auth.uid()` reads from this claim, which is how RLS policies
-- discover the caller's identity. Combined with `SET LOCAL ROLE
-- authenticated` this makes the session look like a signed-in caller.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION tests.set_auth_uid(p_uid UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', p_uid::text, 'role', 'authenticated')::text,
    true -- is_local: only for the current transaction
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- set_session_token_header(token TEXT) -> VOID
--
-- Sets the `request.headers` GUC so the migration-039 policies that read
-- `x-session-token` from the request headers can find a value.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION tests.set_session_token_header(p_token TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config(
    'request.headers',
    json_build_object('x-session-token', p_token)::text,
    true
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- set_anon_claim() -> VOID
--
-- Stuffs `{"role": "anon"}` into the `request.jwt.claims` GUC. Supabase's
-- `auth.role()` reads from this claim rather than from `current_user`, so
-- policies that gate on `auth.role() = 'anon'` (e.g. `anon_insert_responses`)
-- evaluate to NULL — and therefore reject — when the claim is absent, even
-- if the session has `SET LOCAL ROLE anon`. Call this after switching to
-- the anon role and before the first INSERT/SELECT that exercises such a
-- policy. Paired with `clear_auth()` for teardown.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION tests.set_anon_claim()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('role', 'anon')::text,
    true -- is_local: only for the current transaction
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- clear_auth() -> VOID
--
-- Resets both GUCs so subsequent assertions start from a clean slate.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION tests.clear_auth()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', '', true);
  PERFORM set_config('request.headers', '', true);
END;
$$;

-- ---------------------------------------------------------------------------
-- Grant usage + execute so test bodies running under the unprivileged
-- `anon` and `authenticated` roles can reach into this schema. The helpers
-- themselves are SECURITY DEFINER where they need to bypass RLS.
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA tests TO anon, authenticated, PUBLIC;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA tests TO anon, authenticated, PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA tests
  GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, PUBLIC;
