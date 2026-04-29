-- pgTAP - cookie-free analytics stores aggregate counters only and keeps
-- access behind the service-role writer plus CC+C read RPC.

BEGIN;
\set TAP_HELPERS_INCLUDED 1
\ir helpers/fixtures.sql
SELECT plan(9);

SELECT tests.create_test_org('security-analytics-org') AS org_id \gset
SELECT tests.create_test_user(:'org_id'::uuid, 'ccc_member') AS ccc_member_id \gset
SELECT tests.create_test_user(:'org_id'::uuid, 'client_manager') AS client_manager_id \gset
SELECT tests.create_test_survey(:'org_id'::uuid) AS survey_id \gset
SELECT tests.create_test_deployment(:'survey_id'::uuid, true) AS deployment_id \gset

SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);
SELECT public.record_analytics_event(
  jsonb_build_object(
    'eventName', 'route_viewed',
    'surface', 'survey',
    'routeTemplate', '/s/$token',
    'organizationId', :'org_id',
    'surveyId', :'survey_id',
    'deploymentId', :'deployment_id',
    'buildEnv', 'test'
  ),
  '2026-04-29T12:00:00Z'::timestamptz
);
SELECT public.record_analytics_event(
  jsonb_build_object(
    'eventName', 'route_viewed',
    'surface', 'survey',
    'routeTemplate', '/s/$token',
    'organizationId', :'org_id',
    'surveyId', :'survey_id',
    'deploymentId', :'deployment_id',
    'buildEnv', 'test'
  ),
  '2026-04-29T12:03:00Z'::timestamptz
);
SELECT public.record_analytics_event(
  jsonb_build_object(
    'eventName', 'report_generation_requested',
    'surface', 'reports',
    'organizationId', :'org_id',
    'surveyId', :'survey_id',
    'reportFormat', 'pdf',
    'actionStatus', 'succeeded',
    'buildEnv', 'test'
  ),
  '2026-04-29T12:06:00Z'::timestamptz
);
SELECT public.record_analytics_event(
  jsonb_build_object(
    'eventName', 'report_download_requested',
    'surface', 'reports',
    'organizationId', :'org_id',
    'surveyId', :'survey_id',
    'reportFormat', 'pptx',
    'actionStatus', 'requested',
    'buildEnv', 'test'
  ),
  '2026-04-29T12:08:00Z'::timestamptz
);

SELECT is(
  (
    SELECT event_count::int
      FROM public.analytics_daily_counts
     WHERE event_name = 'route_viewed'
       AND route_template = '/s/$token'
  ),
  2,
  'service-role writer increments aggregate daily counters instead of storing raw rows'
);

SELECT throws_ok(
  $sql$
    SELECT public.record_analytics_event(
      '{"eventName":"route_viewed","surface":"survey","userId":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}'::jsonb,
      now()
    )
  $sql$,
  '22023',
  NULL,
  'writer rejects forbidden analytics fields before persistence'
);

SELECT throws_ok(
  $sql$
    SELECT public.record_analytics_event(
      '{"eventName":"route_viewed","surface":"survey","metadata":{"openText":"do not store"}}'::jsonb,
      now()
    )
  $sql$,
  '22023',
  NULL,
  'writer rejects unsupported nested payloads'
);

SET LOCAL ROLE authenticated;
SELECT tests.set_auth_uid(:'client_manager_id'::uuid);

SELECT throws_ok(
  $sql$SELECT count(*) FROM public.analytics_daily_counts$sql$,
  '42501',
  NULL,
  'authenticated users cannot read aggregate table directly'
);

SELECT throws_ok(
  $sql$SELECT public.get_analytics_summary('2026-04-29'::date, '2026-04-29'::date)$sql$,
  '42501',
  NULL,
  'client users cannot read product analytics summary'
);

SELECT tests.set_auth_uid(:'ccc_member_id'::uuid);

SELECT is(
  (
    public.get_analytics_summary('2026-04-29'::date, '2026-04-29'::date)
      ->> 'routeViews'
  )::int,
  2,
  'CC+C users can read aggregate analytics through the authorized RPC'
);

SELECT is(
  (
    SELECT (row->>'count')::int
      FROM jsonb_array_elements(
        public.get_analytics_summary('2026-04-29'::date, '2026-04-29'::date)
          -> 'actionStatuses'
      ) row
     WHERE row->>'eventName' = 'report_generation_requested'
       AND row->>'actionStatus' = 'succeeded'
  ),
  1,
  'analytics summary exposes aggregate action status counts'
);

SELECT is(
  (
    SELECT (row->>'count')::int
      FROM jsonb_array_elements(
        public.get_analytics_summary('2026-04-29'::date, '2026-04-29'::date)
          -> 'reportFormats'
      ) row
     WHERE row->>'reportFormat' = 'pptx'
  ),
  1,
  'analytics summary exposes aggregate report format counts'
);

SELECT is(
  to_regclass('public.analytics_events') IS NULL,
  true,
  'raw analytics event table does not exist'
);

SELECT * FROM finish();
ROLLBACK;
