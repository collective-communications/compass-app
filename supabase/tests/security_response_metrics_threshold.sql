-- pgTAP — security hardening: response metrics redact low-n buckets.

BEGIN;
\set TAP_HELPERS_INCLUDED 1
\ir helpers/fixtures.sql
SELECT plan(6);

SELECT tests.create_test_org('security-response-metrics-org') AS org_id \gset
SELECT tests.create_test_user(:'org_id'::uuid, 'client_manager') AS user_id \gset
SELECT tests.create_test_survey(:'org_id'::uuid) AS survey_id \gset
SELECT tests.create_test_deployment(:'survey_id'::uuid, true) AS dep_id \gset

SET LOCAL ROLE postgres;
INSERT INTO public.organization_settings (organization_id, client_access_enabled)
VALUES (:'org_id'::uuid, true);

UPDATE public.surveys
   SET settings = jsonb_build_object('anonymityThreshold', 3)
 WHERE id = :'survey_id'::uuid;

INSERT INTO public.responses (
  deployment_id,
  session_token,
  metadata_department,
  is_complete,
  created_at,
  submitted_at
)
SELECT
  :'dep_id'::uuid,
  'engineering-small-' || gs::text,
  'Engineering',
  true,
  '2026-04-01 09:00:00+00'::timestamptz,
  '2026-04-01 09:05:00+00'::timestamptz
FROM generate_series(1, 2) AS gs;

INSERT INTO public.responses (
  deployment_id,
  session_token,
  metadata_department,
  is_complete,
  created_at,
  submitted_at
)
SELECT
  :'dep_id'::uuid,
  'operations-safe-' || gs::text,
  'Operations',
  true,
  '2026-04-02 09:00:00+00'::timestamptz,
  '2026-04-02 09:05:00+00'::timestamptz
FROM generate_series(1, 3) AS gs;

SET LOCAL ROLE authenticated;
SELECT tests.set_auth_uid(:'user_id'::uuid);

SELECT public.get_response_metrics(:'survey_id'::uuid) AS metrics \gset

SELECT is(
  :'metrics'::jsonb->>'completedResponses',
  '5',
  'response metrics still return aggregate completed count'
);

SELECT ok(
  :'metrics'::jsonb->'departmentBreakdown'
    @> '[{"department":"Operations","count":3}]'::jsonb,
  'department bucket at threshold is returned'
);

SELECT ok(
  NOT (:'metrics'::jsonb->'departmentBreakdown'
    @> '[{"department":"Engineering","count":2}]'::jsonb),
  'department bucket below threshold is redacted'
);

SELECT is(
  :'metrics'::jsonb->>'hasMaskedDepartmentBreakdown',
  'true',
  'response metrics report that a department bucket was masked'
);

SELECT ok(
  :'metrics'::jsonb->'dailyCompletions'
    @> '[{"date":"2026-04-02","count":3}]'::jsonb,
  'daily completion bucket at threshold is returned'
);

SELECT ok(
  NOT (:'metrics'::jsonb->'dailyCompletions'
    @> '[{"date":"2026-04-01","count":2}]'::jsonb),
  'daily completion bucket below threshold is redacted'
);

SELECT * FROM finish();
ROLLBACK;
