-- Security audit remediation
--
-- Closes direct API/RLS gaps found after the boundary hardening migration:
--   * answers must belong to the response deployment's survey
--   * anonymity thresholds resolve from survey settings first
--   * low-n result RPC payloads redact metrics, not only flags
--   * report storage reads mirror report row visibility

-- ============================================================================
-- Answer writes must stay inside the response survey
-- ============================================================================

CREATE OR REPLACE FUNCTION public.answer_matches_response_survey(
  p_response_id UUID,
  p_question_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.responses r
      JOIN public.deployments dep ON dep.id = r.deployment_id
      JOIN public.questions q ON q.id = p_question_id
     WHERE r.id = p_response_id
       AND q.survey_id = dep.survey_id
  );
$$;

CREATE OR REPLACE FUNCTION public.enforce_answer_response_question_survey()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NOT public.answer_matches_response_survey(NEW.response_id, NEW.question_id) THEN
    RAISE EXCEPTION 'answer question must belong to the response survey'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_answer_response_question_survey ON public.answers;
CREATE TRIGGER enforce_answer_response_question_survey
  BEFORE INSERT OR UPDATE OF response_id, question_id ON public.answers
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_answer_response_question_survey();

DROP POLICY IF EXISTS "anon_insert_answers" ON public.answers;
CREATE POLICY "anon_insert_answers" ON public.answers FOR INSERT
  WITH CHECK (
    auth.role() = 'anon'
    AND public.is_valid_response(response_id)
    AND public.response_session_matches_header(response_id)
    AND public.answer_matches_response_survey(response_id, question_id)
  );

DROP POLICY IF EXISTS "anon_update_own_answers" ON public.answers;
CREATE POLICY "anon_update_own_answers" ON public.answers FOR UPDATE
  USING (
    auth.role() = 'anon'
    AND public.is_valid_response(response_id)
    AND public.response_session_matches_header(response_id)
    AND public.answer_matches_response_survey(response_id, question_id)
  )
  WITH CHECK (
    auth.role() = 'anon'
    AND public.is_valid_response(response_id)
    AND public.response_session_matches_header(response_id)
    AND public.answer_matches_response_survey(response_id, question_id)
  );

DROP POLICY IF EXISTS "authenticated_insert_answers" ON public.answers;
CREATE POLICY "authenticated_insert_answers" ON public.answers FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND public.is_valid_response(response_id)
    AND public.response_session_matches_header(response_id)
    AND public.answer_matches_response_survey(response_id, question_id)
  );

DROP POLICY IF EXISTS "authenticated_update_own_answers" ON public.answers;
CREATE POLICY "authenticated_update_own_answers" ON public.answers FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND public.is_valid_response(response_id)
    AND public.response_session_matches_header(response_id)
    AND public.answer_matches_response_survey(response_id, question_id)
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND public.is_valid_response(response_id)
    AND public.response_session_matches_header(response_id)
    AND public.answer_matches_response_survey(response_id, question_id)
  );

REVOKE ALL ON FUNCTION public.answer_matches_response_survey(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_answer_response_question_survey() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.answer_matches_response_survey(UUID, UUID)
  TO anon, authenticated, service_role;

-- ============================================================================
-- Survey-scoped anonymity threshold helper
-- ============================================================================

CREATE OR REPLACE FUNCTION public.anonymity_threshold_for_survey(p_survey_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_threshold INT;
BEGIN
  SELECT CASE
           WHEN sv.settings ? 'anonymityThreshold'
             AND (sv.settings->>'anonymityThreshold') ~ '^[0-9]+$'
             AND (sv.settings->>'anonymityThreshold')::int > 0
           THEN (sv.settings->>'anonymityThreshold')::int
         END
    INTO v_threshold
    FROM public.surveys sv
   WHERE sv.id = p_survey_id;

  IF v_threshold IS NOT NULL THEN
    RETURN v_threshold;
  END IF;

  SELECT CASE
           WHEN o.settings ? 'anonymityThreshold'
             AND (o.settings->>'anonymityThreshold') ~ '^[0-9]+$'
             AND (o.settings->>'anonymityThreshold')::int > 0
           THEN (o.settings->>'anonymityThreshold')::int
         END
    INTO v_threshold
    FROM public.organizations o
    JOIN public.surveys sv ON sv.organization_id = o.id
   WHERE sv.id = p_survey_id;

  IF v_threshold IS NOT NULL THEN
    RETURN v_threshold;
  END IF;

  SELECT ps.anonymity_threshold
    INTO v_threshold
    FROM public.platform_settings ps
   WHERE ps.anonymity_threshold > 0
   ORDER BY ps.updated_at DESC, ps.id DESC
   LIMIT 1;

  RETURN COALESCE(v_threshold, 5);
END;
$$;

REVOKE ALL ON FUNCTION public.anonymity_threshold_for_survey(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.anonymity_threshold_for_survey(UUID)
  TO authenticated, service_role;

DROP VIEW IF EXISTS public.safe_segment_scores;
CREATE VIEW public.safe_segment_scores
WITH (security_barrier = true)
AS
SELECT
  s.survey_id,
  s.dimension_id,
  d.code AS dimension_code,
  d.name AS dimension_name,
  d.color AS dimension_color,
  s.segment_type,
  s.segment_value,
  CASE WHEN s.response_count >= threshold.val THEN s.score ELSE NULL END AS score,
  CASE WHEN s.response_count >= threshold.val THEN s.raw_score ELSE NULL END AS raw_score,
  CASE WHEN s.response_count >= threshold.val THEN s.response_count ELSE NULL END AS response_count,
  s.response_count < threshold.val AS is_masked
FROM public.scores s
JOIN public.dimensions d ON d.id = s.dimension_id
CROSS JOIN LATERAL (
  SELECT public.anonymity_threshold_for_survey(s.survey_id) AS val
) threshold
WHERE public.can_read_results(s.survey_id);

GRANT SELECT ON public.safe_segment_scores TO authenticated;

-- ============================================================================
-- Result RPCs redact low-n buckets
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_response_metrics(p_survey_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_total BIGINT;
  v_completed BIGINT;
  v_completion_rate NUMERIC;
  v_avg_duration_ms NUMERIC;
  v_department_breakdown jsonb;
  v_daily_completions jsonb;
  v_has_masked_department_breakdown BOOLEAN;
  v_has_masked_daily_completions BOOLEAN;
  v_threshold INT;
BEGIN
  IF NOT public.can_read_results(p_survey_id) THEN
    RAISE EXCEPTION 'Caller is not permitted to read response metrics for survey %', p_survey_id
      USING ERRCODE = '42501';
  END IF;

  v_threshold := public.anonymity_threshold_for_survey(p_survey_id);

  SELECT COUNT(*), COUNT(*) FILTER (WHERE r.is_complete = true)
    INTO v_total, v_completed
    FROM public.responses r
    JOIN public.deployments d ON d.id = r.deployment_id
   WHERE d.survey_id = p_survey_id;

  v_completion_rate := CASE
    WHEN v_total > 0 THEN (v_completed::NUMERIC / v_total::NUMERIC) * 100
    ELSE 0
  END;

  SELECT AVG(EXTRACT(EPOCH FROM (r.submitted_at - r.created_at)) * 1000)
    INTO v_avg_duration_ms
    FROM public.responses r
    JOIN public.deployments d ON d.id = r.deployment_id
   WHERE d.survey_id = p_survey_id
     AND r.is_complete = true
     AND r.submitted_at IS NOT NULL;

  WITH department_counts AS (
    SELECT COALESCE(NULLIF(r.metadata_department, ''), 'Unknown') AS department,
           COUNT(*) AS cnt
      FROM public.responses r
      JOIN public.deployments d ON d.id = r.deployment_id
     WHERE d.survey_id = p_survey_id
     GROUP BY 1
  )
  SELECT
    COALESCE(
      jsonb_agg(
        jsonb_build_object('department', department, 'count', cnt)
        ORDER BY cnt DESC, department ASC
      ) FILTER (WHERE cnt >= v_threshold),
      '[]'::jsonb
    ),
    COALESCE(bool_or(cnt < v_threshold), false)
    INTO v_department_breakdown, v_has_masked_department_breakdown
    FROM department_counts;

  WITH daily_counts AS (
    SELECT to_char(r.submitted_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date,
           COUNT(*) AS cnt
      FROM public.responses r
      JOIN public.deployments d ON d.id = r.deployment_id
     WHERE d.survey_id = p_survey_id
       AND r.is_complete = true
       AND r.submitted_at IS NOT NULL
     GROUP BY 1
  )
  SELECT
    COALESCE(
      jsonb_agg(
        jsonb_build_object('date', date, 'count', cnt)
        ORDER BY date ASC
      ) FILTER (WHERE cnt >= v_threshold),
      '[]'::jsonb
    ),
    COALESCE(bool_or(cnt < v_threshold), false)
    INTO v_daily_completions, v_has_masked_daily_completions
    FROM daily_counts;

  RETURN jsonb_build_object(
    'totalResponses', v_total,
    'completedResponses', v_completed,
    'completionRate', v_completion_rate,
    'averageCompletionTimeMs', v_avg_duration_ms,
    'departmentBreakdown', v_department_breakdown,
    'dailyCompletions', v_daily_completions,
    'anonymityThreshold', v_threshold,
    'hasMaskedDepartmentBreakdown', v_has_masked_department_breakdown,
    'hasMaskedDailyCompletions', v_has_masked_daily_completions
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_segment_question_scores(
  p_survey_id UUID,
  p_segment_type TEXT,
  p_segment_value TEXT
)
RETURNS TABLE (
  question_id UUID,
  question_text TEXT,
  order_index INT,
  is_reverse_scored BOOLEAN,
  sub_dimension_code TEXT,
  sub_dimension_name TEXT,
  dimension_id UUID,
  dimension_code TEXT,
  dimension_name TEXT,
  dimension_color TEXT,
  response_count BIGINT,
  mean_score NUMERIC,
  dist_1 BIGINT,
  dist_2 BIGINT,
  dist_3 BIGINT,
  dist_4 BIGINT,
  dist_5 BIGINT,
  dist_6 BIGINT,
  dist_7 BIGINT,
  dist_8 BIGINT,
  dist_9 BIGINT,
  dist_10 BIGINT,
  is_masked BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NOT public.can_read_results(p_survey_id) THEN
    RAISE EXCEPTION 'Caller is not permitted to read segment question scores for survey %', p_survey_id
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH threshold AS (
    SELECT public.anonymity_threshold_for_survey(p_survey_id) AS val
  ),
  segment_responses AS (
    SELECT r.id
      FROM public.responses r
      JOIN public.deployments dep ON dep.id = r.deployment_id
     WHERE dep.survey_id = p_survey_id
       AND r.is_complete = true
       AND CASE p_segment_type
             WHEN 'department' THEN r.metadata_department = p_segment_value
             WHEN 'role'       THEN r.metadata_role       = p_segment_value
             WHEN 'location'   THEN r.metadata_location   = p_segment_value
             WHEN 'tenure'     THEN r.metadata_tenure     = p_segment_value
             ELSE false
           END
  ),
  segment_respondent_count AS (
    SELECT COUNT(*) AS total FROM segment_responses
  ),
  masking AS (
    SELECT src.total < t.val AS is_masked
      FROM segment_respondent_count src
      CROSS JOIN threshold t
  )
  SELECT
    q.id AS question_id,
    q.text AS question_text,
    q.order_index,
    q.reverse_scored AS is_reverse_scored,
    sd.code AS sub_dimension_code,
    sd.name AS sub_dimension_name,
    d.id AS dimension_id,
    d.code AS dimension_code,
    d.name AS dimension_name,
    d.color AS dimension_color,
    CASE
      WHEN m.is_masked THEN NULL::BIGINT
      ELSE COUNT(a.id) FILTER (WHERE a.likert_value IS NOT NULL)
    END AS response_count,
    CASE
      WHEN m.is_masked THEN NULL::NUMERIC
      ELSE AVG(a.likert_value) FILTER (WHERE a.likert_value IS NOT NULL)
    END AS mean_score,
    CASE WHEN m.is_masked THEN NULL::BIGINT ELSE COUNT(a.id) FILTER (WHERE a.likert_value = 1) END AS dist_1,
    CASE WHEN m.is_masked THEN NULL::BIGINT ELSE COUNT(a.id) FILTER (WHERE a.likert_value = 2) END AS dist_2,
    CASE WHEN m.is_masked THEN NULL::BIGINT ELSE COUNT(a.id) FILTER (WHERE a.likert_value = 3) END AS dist_3,
    CASE WHEN m.is_masked THEN NULL::BIGINT ELSE COUNT(a.id) FILTER (WHERE a.likert_value = 4) END AS dist_4,
    CASE WHEN m.is_masked THEN NULL::BIGINT ELSE COUNT(a.id) FILTER (WHERE a.likert_value = 5) END AS dist_5,
    CASE WHEN m.is_masked THEN NULL::BIGINT ELSE COUNT(a.id) FILTER (WHERE a.likert_value = 6) END AS dist_6,
    CASE WHEN m.is_masked THEN NULL::BIGINT ELSE COUNT(a.id) FILTER (WHERE a.likert_value = 7) END AS dist_7,
    CASE WHEN m.is_masked THEN NULL::BIGINT ELSE COUNT(a.id) FILTER (WHERE a.likert_value = 8) END AS dist_8,
    CASE WHEN m.is_masked THEN NULL::BIGINT ELSE COUNT(a.id) FILTER (WHERE a.likert_value = 9) END AS dist_9,
    CASE WHEN m.is_masked THEN NULL::BIGINT ELSE COUNT(a.id) FILTER (WHERE a.likert_value = 10) END AS dist_10,
    m.is_masked
  FROM public.questions q
  JOIN public.question_dimensions qd ON qd.question_id = q.id
  JOIN public.dimensions d ON d.id = qd.dimension_id
  CROSS JOIN masking m
  LEFT JOIN public.sub_dimensions sd ON sd.id = q.sub_dimension_id
  LEFT JOIN public.answers a ON a.question_id = q.id
    AND a.response_id IN (SELECT id FROM segment_responses)
  WHERE q.survey_id = p_survey_id
  GROUP BY q.id, q.text, q.order_index, q.reverse_scored,
           q.sub_dimension_id, sd.code, sd.name,
           d.id, d.code, d.name, d.color,
           m.is_masked;
END;
$$;

REVOKE ALL ON FUNCTION public.get_response_metrics(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_segment_question_scores(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_response_metrics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_segment_question_scores(UUID, TEXT, TEXT) TO authenticated;

-- ============================================================================
-- Report storage reads must match report visibility
-- ============================================================================

DROP POLICY IF EXISTS reports_client_read ON public.reports;
CREATE POLICY reports_client_read ON public.reports FOR SELECT
  USING (
    client_visible = true
    AND status IN ('ready', 'completed')
    AND public.can_read_org_results(reports.organization_id)
  );

DROP POLICY IF EXISTS reports_storage_read ON storage.objects;
CREATE POLICY reports_storage_read ON storage.objects FOR SELECT
  USING (
    bucket_id = 'reports'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1
        FROM public.reports r
       WHERE r.storage_path = storage.objects.name
         AND r.organization_id = public.storage_object_org_id(storage.objects.name)
         AND r.client_visible = true
         AND r.status IN ('ready', 'completed')
         AND public.can_read_org_results(r.organization_id)
    )
  );
