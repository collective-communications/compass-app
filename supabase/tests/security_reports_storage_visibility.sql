-- pgTAP — security hardening: report storage reads match report visibility.

BEGIN;
\set TAP_HELPERS_INCLUDED 1
\ir helpers/fixtures.sql
SELECT plan(4);

SELECT tests.create_test_org('security-report-storage-org') AS org_id \gset
SELECT tests.create_test_user(:'org_id'::uuid, 'client_manager') AS user_id \gset
SELECT tests.create_test_survey(:'org_id'::uuid) AS survey_id \gset

SELECT (:'org_id'::uuid::text || '/visible-report.pdf') AS visible_path \gset
SELECT (:'org_id'::uuid::text || '/hidden-report.pdf') AS hidden_path \gset
SELECT (:'org_id'::uuid::text || '/generating-report.pdf') AS generating_path \gset

SET LOCAL ROLE postgres;
INSERT INTO public.organization_settings (organization_id, client_access_enabled)
VALUES (:'org_id'::uuid, true);

INSERT INTO public.reports (
  id,
  survey_id,
  organization_id,
  title,
  status,
  storage_path,
  client_visible,
  triggered_by
) VALUES
  (
    'aaaaaaaa-6666-6666-6666-aaaaaaaaaaaa'::uuid,
    :'survey_id'::uuid,
    :'org_id'::uuid,
    'Visible report',
    'completed',
    :'visible_path',
    true,
    'pgtap'
  ),
  (
    'bbbbbbbb-6666-6666-6666-bbbbbbbbbbbb'::uuid,
    :'survey_id'::uuid,
    :'org_id'::uuid,
    'Hidden report',
    'completed',
    :'hidden_path',
    false,
    'pgtap'
  ),
  (
    'cccccccc-6666-6666-6666-cccccccccccc'::uuid,
    :'survey_id'::uuid,
    :'org_id'::uuid,
    'Generating report',
    'generating',
    :'generating_path',
    true,
    'pgtap'
  );

INSERT INTO storage.objects (id, bucket_id, name, owner, metadata)
VALUES
  (
    'dddddddd-6666-6666-6666-dddddddddddd'::uuid,
    'reports',
    :'visible_path',
    :'user_id'::uuid,
    '{"mimetype":"application/pdf"}'::jsonb
  ),
  (
    'eeeeeeee-6666-6666-6666-eeeeeeeeeeee'::uuid,
    'reports',
    :'hidden_path',
    :'user_id'::uuid,
    '{"mimetype":"application/pdf"}'::jsonb
  ),
  (
    'ffffffff-6666-6666-6666-ffffffffffff'::uuid,
    'reports',
    :'generating_path',
    :'user_id'::uuid,
    '{"mimetype":"application/pdf"}'::jsonb
  );

SET LOCAL ROLE authenticated;
SELECT tests.set_auth_uid(:'user_id'::uuid);

SELECT is(
  (SELECT count(*)::int
     FROM storage.objects
    WHERE bucket_id = 'reports'
      AND name = :'visible_path'),
  1,
  'client can read storage object for visible completed report'
);

SELECT is(
  (SELECT count(*)::int
     FROM storage.objects
    WHERE bucket_id = 'reports'
      AND name = :'hidden_path'),
  0,
  'client cannot read storage object for hidden report'
);

SELECT is(
  (SELECT count(*)::int
     FROM storage.objects
    WHERE bucket_id = 'reports'
      AND name = :'generating_path'),
  0,
  'client cannot read storage object for unfinished report'
);

SET LOCAL ROLE postgres;
UPDATE public.organization_settings
   SET client_access_enabled = false
 WHERE organization_id = :'org_id'::uuid;

SET LOCAL ROLE authenticated;
SELECT tests.set_auth_uid(:'user_id'::uuid);

SELECT is(
  (SELECT count(*)::int
     FROM storage.objects
    WHERE bucket_id = 'reports'
      AND name = :'visible_path'),
  0,
  'client cannot read report storage after client access is disabled'
);

SELECT * FROM finish();
ROLLBACK;
