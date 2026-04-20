-- pgTAP — `safe_segment_scores` view anonymity threshold
--
-- The view enforces the "segment too small to be safe" guard: if fewer
-- than `anonymityThreshold` responses feed a segment, the score/raw_score
-- /response_count columns are NULLed out and `is_masked` is true. When
-- the count is at or above the threshold, the real values come through
-- and `is_masked` is false.
--
-- `anonymityThreshold` is read from `organizations.settings->>'anonymityThreshold'`
-- (JSONB), defaulting to 5. Tests use the default so we don't duplicate
-- the default-value logic.
--
-- Invariants:
--   1. A segment with 4 responses (below threshold) -> is_masked=true,
--      score/raw_score/response_count all NULL.
--   2. A segment with 7 responses (at/above threshold) -> is_masked=false,
--      score/raw_score/response_count populated with the real values.
--   3. The organization-level (segment_type IS NULL) row, which is seeded
--      with a high response count, is also surfaced and unmasked.

BEGIN;
\set TAP_HELPERS_INCLUDED 1
\ir helpers/fixtures.sql
SELECT plan(7);

-- ---------------------------------------------------------------------------
-- Fixture setup
-- ---------------------------------------------------------------------------
SELECT tests.create_test_org('threshold-org')    AS org_id    \gset
SELECT tests.create_test_survey(:'org_id'::uuid) AS survey_id \gset

-- Resolve the 'clarity' dimension id — seeded in migration 00000000000001.
SELECT id AS dim_id FROM public.dimensions WHERE code = 'clarity' \gset

SET LOCAL ROLE postgres;

-- Segment A: department='Engineering', 4 responses (below threshold 5).
INSERT INTO public.scores (
  survey_id, dimension_id, segment_type, segment_value,
  score, raw_score, response_count
) VALUES (
  :'survey_id'::uuid, :'dim_id'::uuid, 'department', 'Engineering',
  72.50, 3.90, 4
);

-- Segment B: department='Operations', 7 responses (at/above threshold).
INSERT INTO public.scores (
  survey_id, dimension_id, segment_type, segment_value,
  score, raw_score, response_count
) VALUES (
  :'survey_id'::uuid, :'dim_id'::uuid, 'department', 'Operations',
  68.00, 3.72, 7
);

-- Org-level roll-up (no segment): 25 responses.
INSERT INTO public.scores (
  survey_id, dimension_id, segment_type, segment_value,
  score, raw_score, response_count
) VALUES (
  :'survey_id'::uuid, :'dim_id'::uuid, NULL, NULL,
  70.00, 3.80, 25
);

-- ===========================================================================
-- Assertion 1: masked segment has is_masked=true.
-- ===========================================================================
SELECT is(
  (SELECT is_masked FROM public.safe_segment_scores
     WHERE survey_id = :'survey_id'::uuid
       AND segment_type = 'department'
       AND segment_value = 'Engineering'),
  true,
  'segment with 4 responses (below threshold 5) is marked is_masked'
);

-- ===========================================================================
-- Assertion 2: masked segment has score/raw_score/response_count = NULL.
-- ===========================================================================
SELECT is(
  (SELECT score FROM public.safe_segment_scores
     WHERE survey_id = :'survey_id'::uuid
       AND segment_type = 'department'
       AND segment_value = 'Engineering'),
  NULL::numeric,
  'masked segment nulls out the score column'
);

SELECT is(
  (SELECT response_count FROM public.safe_segment_scores
     WHERE survey_id = :'survey_id'::uuid
       AND segment_type = 'department'
       AND segment_value = 'Engineering'),
  NULL::int,
  'masked segment nulls out the response_count column'
);

-- ===========================================================================
-- Assertion 3: unmasked segment has is_masked=false and real values.
-- ===========================================================================
SELECT is(
  (SELECT is_masked FROM public.safe_segment_scores
     WHERE survey_id = :'survey_id'::uuid
       AND segment_type = 'department'
       AND segment_value = 'Operations'),
  false,
  'segment with 7 responses (>= threshold 5) is NOT is_masked'
);

SELECT is(
  (SELECT score FROM public.safe_segment_scores
     WHERE survey_id = :'survey_id'::uuid
       AND segment_type = 'department'
       AND segment_value = 'Operations'),
  68.00::numeric,
  'unmasked segment surfaces the real score value'
);

SELECT is(
  (SELECT response_count FROM public.safe_segment_scores
     WHERE survey_id = :'survey_id'::uuid
       AND segment_type = 'department'
       AND segment_value = 'Operations'),
  7,
  'unmasked segment surfaces the real response_count'
);

-- ===========================================================================
-- Assertion 4: org-level roll-up row is present and unmasked.
-- (Regression guard — earlier view iterations accidentally filtered it
-- out because of a missing NULL-safe comparison.)
-- ===========================================================================
SELECT is(
  (SELECT is_masked FROM public.safe_segment_scores
     WHERE survey_id = :'survey_id'::uuid
       AND segment_type IS NULL
       AND segment_value IS NULL),
  false,
  'org-level (segment_type IS NULL) row is surfaced and unmasked'
);

SELECT * FROM finish();
ROLLBACK;
