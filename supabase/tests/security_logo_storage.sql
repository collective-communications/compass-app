-- pgTAP — security hardening: logo storage writes are org-scoped.

BEGIN;
\set TAP_HELPERS_INCLUDED 1
\ir helpers/fixtures.sql
SELECT plan(5);

SELECT tests.create_test_org('security-logos-a') AS org_a_id \gset
SELECT tests.create_test_org('security-logos-b') AS org_b_id \gset
SELECT tests.create_test_user(:'org_a_id'::uuid, 'client_exec') AS user_a_id \gset

SELECT (:'org_a_id'::uuid::text || '/logo.png') AS org_a_logo_path \gset
SELECT (:'org_b_id'::uuid::text || '/logo.png') AS org_b_logo_path \gset
SELECT (:'org_b_id'::uuid::text || '/other-logo.png') AS org_b_other_logo_path \gset

SET LOCAL ROLE postgres;

SELECT is(
  (SELECT allowed_mime_types FROM storage.buckets WHERE id = 'logos'),
  ARRAY['image/png', 'image/jpeg', 'image/webp'],
  'logos bucket allows only PNG, JPEG, and WebP MIME types'
);

INSERT INTO storage.objects (id, bucket_id, name, owner, metadata)
VALUES (
  'aaaaaaaa-3333-3333-3333-aaaaaaaaaaaa'::uuid,
  'logos',
  :'org_b_logo_path',
  :'user_a_id'::uuid,
  '{"mimetype":"image/png"}'::jsonb
);

SET LOCAL ROLE authenticated;
SELECT tests.set_auth_uid(:'user_a_id'::uuid);

SELECT lives_ok(
  format(
    $sql$INSERT INTO storage.objects (id, bucket_id, name, owner, metadata)
         VALUES ('bbbbbbbb-3333-3333-3333-bbbbbbbbbbbb'::uuid, 'logos', %L, %L::uuid, '{"mimetype":"image/png"}'::jsonb)$sql$,
    :'org_a_logo_path',
    :'user_a_id'
  ),
  'client exec can upload a logo under their own organization path'
);

SELECT throws_ok(
  format(
    $sql$INSERT INTO storage.objects (id, bucket_id, name, owner, metadata)
         VALUES ('cccccccc-3333-3333-3333-cccccccccccc'::uuid, 'logos', %L, %L::uuid, '{"mimetype":"image/png"}'::jsonb)$sql$,
    :'org_b_other_logo_path',
    :'user_a_id'
  ),
  '42501',
  NULL,
  'client exec cannot upload a logo under another organization path'
);

SELECT throws_ok(
  format(
    $sql$INSERT INTO storage.objects (id, bucket_id, name, owner, metadata)
         VALUES ('dddddddd-3333-3333-3333-dddddddddddd'::uuid, 'logos', 'not-a-uuid/logo.png', %L::uuid, '{"mimetype":"image/png"}'::jsonb)$sql$,
    :'user_a_id'
  ),
  '42501',
  NULL,
  'logo upload path must start with a valid organization UUID'
);

DELETE FROM storage.objects
 WHERE id = 'aaaaaaaa-3333-3333-3333-aaaaaaaaaaaa'::uuid;

SET LOCAL ROLE postgres;
SELECT is(
  (SELECT count(*)::int
     FROM storage.objects
    WHERE id = 'aaaaaaaa-3333-3333-3333-aaaaaaaaaaaa'::uuid),
  1,
  'client exec cannot delete another organization logo object'
);

SELECT * FROM finish();
ROLLBACK;
