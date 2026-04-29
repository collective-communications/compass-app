-- pgTAP — security hardening: survey anonymity threshold overrides org default.

BEGIN;
\set TAP_HELPERS_INCLUDED 1
\ir helpers/fixtures.sql
SELECT plan(4);

SELECT tests.create_test_org('security-survey-threshold-org') AS org_id \gset
SELECT tests.create_test_user(:'org_id'::uuid, 'client_manager') AS user_id \gset
SELECT tests.create_test_survey(:'org_id'::uuid) AS survey_id \gset
SELECT id AS dimension_id FROM public.dimensions WHERE code = 'clarity' \gset

SET LOCAL ROLE postgres;
INSERT INTO public.organization_settings (organization_id, client_access_enabled)
VALUES (:'org_id'::uuid, true);

UPDATE public.surveys
   SET settings = jsonb_build_object('anonymityThreshold', 8)
 WHERE id = :'survey_id'::uuid;

INSERT INTO public.scores (
  survey_id,
  dimension_id,
  segment_type,
  segment_value,
  score,
  raw_score,
  response_count
) VALUES
  (:'survey_id'::uuid, :'dimension_id'::uuid, 'department', 'Engineering', 72, 3.7, 7),
  (:'survey_id'::uuid, :'dimension_id'::uuid, 'department', 'Operations', 76, 3.9, 8);

SET LOCAL ROLE authenticated;
SELECT tests.set_auth_uid(:'user_id'::uuid);

SELECT is(
  public.anonymity_threshold_for_survey(:'survey_id'::uuid),
  8,
  'threshold helper resolves survey-level anonymityThreshold first'
);

SELECT is(
  (SELECT is_masked FROM public.safe_segment_scores
    WHERE survey_id = :'survey_id'::uuid
      AND segment_type = 'department'
      AND segment_value = 'Engineering'),
  true,
  'segment below the survey threshold is masked even when it is above org default'
);

SELECT is(
  (SELECT response_count FROM public.safe_segment_scores
    WHERE survey_id = :'survey_id'::uuid
      AND segment_type = 'department'
      AND segment_value = 'Engineering'),
  NULL::int,
  'survey-threshold masked segment redacts response_count'
);

SELECT is(
  (SELECT is_masked FROM public.safe_segment_scores
    WHERE survey_id = :'survey_id'::uuid
      AND segment_type = 'department'
      AND segment_value = 'Operations'),
  false,
  'segment at the survey threshold is unmasked'
);

SELECT * FROM finish();
ROLLBACK;
