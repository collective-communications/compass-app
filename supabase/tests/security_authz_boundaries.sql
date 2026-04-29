-- pgTAP — security hardening: CCC member cannot mutate authorization state.

BEGIN;
\set TAP_HELPERS_INCLUDED 1
\ir helpers/fixtures.sql
SELECT plan(4);

SELECT tests.create_test_org('security-authz-org') AS org_id \gset
SELECT tests.create_test_user(:'org_id'::uuid, 'ccc_admin') AS admin_id \gset
SELECT tests.create_test_user(:'org_id'::uuid, 'ccc_member') AS member_id \gset
SELECT tests.create_test_user(:'org_id'::uuid, 'client_manager') AS target_id \gset
SELECT tests.create_test_user(:'org_id'::uuid, 'client_manager') AS stale_id \gset
SELECT tests.create_test_survey(:'org_id'::uuid) AS survey_id \gset

SET LOCAL ROLE postgres;
INSERT INTO public.user_profiles (id, email, role, assigned_clients)
VALUES
  (:'member_id'::uuid, 'member@example.test', 'ccc_member', '{}'),
  (:'target_id'::uuid, 'target@example.test', 'client_manager', '{}'),
  (:'stale_id'::uuid, 'stale@example.test', 'ccc_admin', ARRAY[:'org_id'::uuid]);

DELETE FROM public.org_members
 WHERE user_id = :'stale_id'::uuid;

INSERT INTO public.survey_recipients (id, survey_id, email)
VALUES (
  'aaaaaaaa-4444-4444-4444-aaaaaaaaaaaa'::uuid,
  :'survey_id'::uuid,
  'recipient@example.test'
);

SET LOCAL ROLE authenticated;
SELECT tests.set_auth_uid(:'member_id'::uuid);

UPDATE public.org_members
   SET role = 'ccc_admin'::public.user_role
 WHERE user_id = :'target_id'::uuid;

SELECT is(
  (SELECT role::text FROM public.org_members WHERE user_id = :'target_id'::uuid),
  'client_manager',
  'ccc_member direct org_members update does not change effective role'
);

UPDATE public.user_profiles
   SET role = 'ccc_admin'::public.user_role
 WHERE id = :'target_id'::uuid;

SELECT is(
  (SELECT role::text FROM public.user_profiles WHERE id = :'target_id'::uuid),
  'client_manager',
  'ccc_member direct user_profiles update does not change profile role'
);

SELECT tests.set_auth_uid(:'stale_id'::uuid);

SELECT is(
  (SELECT count(*)::int FROM public.survey_recipients WHERE survey_id = :'survey_id'::uuid),
  0,
  'stale user_profiles role and assigned_clients do not grant recipient access'
);

SELECT tests.set_auth_uid(:'admin_id'::uuid);

UPDATE public.org_members
   SET role = 'client_director'::public.user_role
 WHERE user_id = :'target_id'::uuid;

SELECT is(
  (SELECT role::text FROM public.org_members WHERE user_id = :'target_id'::uuid),
  'client_director',
  'ccc_admin can still perform legitimate org_members role updates'
);

SELECT * FROM finish();
ROLLBACK;
