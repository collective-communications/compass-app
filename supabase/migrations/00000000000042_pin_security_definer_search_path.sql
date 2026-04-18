-- Defense-in-depth: pin search_path on all SECURITY DEFINER functions to
-- prevent privilege escalation via shadowed pg_catalog entries. Without an
-- explicit search_path, a superuser or extension can inject a schema entry
-- that shadows a built-in function referenced inside these helpers.
--
-- Functions covered:
--   migration 004 — auth_user_role, auth_user_org_id, is_ccc_user
--   migration 012 — is_valid_deployment
--   migration 013 — is_valid_response
--   migration 030 — reorder_questions
--   migration 037 — get_segment_question_scores
--   migration 039 — reorder_questions (re-declared), auth_user_role (re-declared),
--                   auth_user_org_id (re-declared)
--
-- Functions 004/039 are re-declared and therefore the ALTER FUNCTION below
-- pins whichever definition is currently active in the schema.

ALTER FUNCTION public.auth_user_role() SET search_path = pg_catalog, public;
ALTER FUNCTION public.auth_user_org_id() SET search_path = pg_catalog, public;
ALTER FUNCTION public.is_ccc_user() SET search_path = pg_catalog, public;
ALTER FUNCTION public.is_valid_deployment(uuid) SET search_path = pg_catalog, public;
ALTER FUNCTION public.is_valid_response(uuid) SET search_path = pg_catalog, public;
ALTER FUNCTION public.reorder_questions(uuid, uuid[], int[]) SET search_path = pg_catalog, public;
ALTER FUNCTION public.get_segment_question_scores(uuid, text, text) SET search_path = pg_catalog, public;
