-- Security Boundary Hardening
--
-- Route guards are UX only. Supabase RLS, storage policies, and RPC-internal
-- authorization are the enforcement boundary for direct API callers.

-- ============================================================================
-- Explicit authorization helpers
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_ccc_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.org_members om
     WHERE om.user_id = auth.uid()
       AND om.role = 'ccc_admin'::public.user_role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_ccc_user()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.org_members om
     WHERE om.user_id = auth.uid()
       AND om.role IN ('ccc_admin'::public.user_role, 'ccc_member'::public.user_role)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.org_members om
     WHERE om.user_id = auth.uid()
       AND om.organization_id = p_org_id
       AND om.role = 'client_exec'::public.user_role
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_org(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT p_org_id IS NOT NULL
     AND (public.is_ccc_user() OR public.is_org_admin(p_org_id));
$$;

CREATE OR REPLACE FUNCTION public.client_access_enabled_for_org(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT COALESCE(
    (SELECT os.client_access_enabled
       FROM public.organization_settings os
      WHERE os.organization_id = p_org_id),
    (SELECT o.client_access_enabled
       FROM public.organizations o
      WHERE o.id = p_org_id),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.can_read_org_results(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT
    auth.role() = 'service_role'
    OR public.is_ccc_user()
    OR (
      public.client_access_enabled_for_org(p_org_id)
      AND EXISTS (
        SELECT 1
          FROM public.org_members om
         WHERE om.user_id = auth.uid()
           AND om.organization_id = p_org_id
           AND om.role IN (
             'client_exec'::public.user_role,
             'client_director'::public.user_role,
             'client_manager'::public.user_role
           )
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.can_read_results(p_survey_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.surveys s
     WHERE s.id = p_survey_id
       AND public.can_read_org_results(s.organization_id)
  );
$$;

REVOKE ALL ON FUNCTION public.is_ccc_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_ccc_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_org_admin(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_manage_org(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.client_access_enabled_for_org(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_read_org_results(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_read_results(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_ccc_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_ccc_user() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_org_admin(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_manage_org(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.client_access_enabled_for_org(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_read_org_results(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_read_results(UUID) TO authenticated, service_role;

-- ============================================================================
-- Admin-only mutation boundaries
-- ============================================================================

DROP POLICY IF EXISTS "ccc_admin_all_orgs" ON public.organizations;
DROP POLICY IF EXISTS ccc_users_read_orgs ON public.organizations;
DROP POLICY IF EXISTS ccc_admin_manage_orgs ON public.organizations;
CREATE POLICY ccc_users_read_orgs ON public.organizations
  FOR SELECT TO authenticated
  USING (public.is_ccc_user());
CREATE POLICY ccc_admin_manage_orgs ON public.organizations
  FOR ALL TO authenticated
  USING (public.is_ccc_admin())
  WITH CHECK (public.is_ccc_admin());

DROP POLICY IF EXISTS "ccc_admin_all_members" ON public.org_members;
DROP POLICY IF EXISTS ccc_users_read_members ON public.org_members;
DROP POLICY IF EXISTS ccc_admin_manage_members ON public.org_members;
CREATE POLICY ccc_users_read_members ON public.org_members
  FOR SELECT TO authenticated
  USING (public.is_ccc_user());
CREATE POLICY ccc_admin_manage_members ON public.org_members
  FOR ALL TO authenticated
  USING (public.is_ccc_admin())
  WITH CHECK (public.is_ccc_admin());

DROP POLICY IF EXISTS "ccc_all_user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS ccc_users_read_user_profiles ON public.user_profiles;
DROP POLICY IF EXISTS ccc_admin_manage_user_profiles ON public.user_profiles;
CREATE POLICY ccc_users_read_user_profiles ON public.user_profiles
  FOR SELECT TO authenticated
  USING (public.is_ccc_user());
CREATE POLICY ccc_admin_manage_user_profiles ON public.user_profiles
  FOR ALL TO authenticated
  USING (public.is_ccc_admin())
  WITH CHECK (public.is_ccc_admin());

DROP POLICY IF EXISTS "ccc_all_invitations" ON public.invitations;
DROP POLICY IF EXISTS ccc_admin_manage_invitations ON public.invitations;
CREATE POLICY ccc_admin_manage_invitations ON public.invitations
  FOR ALL TO authenticated
  USING (public.is_ccc_admin())
  WITH CHECK (public.is_ccc_admin());

DROP POLICY IF EXISTS "ccc_all_org_settings" ON public.organization_settings;
DROP POLICY IF EXISTS ccc_users_read_org_settings ON public.organization_settings;
DROP POLICY IF EXISTS ccc_admin_manage_org_settings ON public.organization_settings;
CREATE POLICY ccc_users_read_org_settings ON public.organization_settings
  FOR SELECT TO authenticated
  USING (public.is_ccc_user());
CREATE POLICY ccc_admin_manage_org_settings ON public.organization_settings
  FOR ALL TO authenticated
  USING (public.is_ccc_admin())
  WITH CHECK (public.is_ccc_admin());

DROP POLICY IF EXISTS "ccc_all_platform_settings" ON public.platform_settings;
DROP POLICY IF EXISTS ccc_admin_manage_platform_settings ON public.platform_settings;
CREATE POLICY ccc_admin_manage_platform_settings ON public.platform_settings
  FOR ALL TO authenticated
  USING (public.is_ccc_admin())
  WITH CHECK (public.is_ccc_admin());

DROP POLICY IF EXISTS "ccc_users_read_email_log" ON public.email_log;
DROP POLICY IF EXISTS ccc_admin_read_email_log ON public.email_log;
CREATE POLICY ccc_admin_read_email_log ON public.email_log
  FOR SELECT TO authenticated
  USING (public.is_ccc_admin());

DROP POLICY IF EXISTS "ccc_users_manage_templates" ON public.email_templates;
DROP POLICY IF EXISTS ccc_users_manage_templates ON public.email_templates;
CREATE POLICY ccc_users_manage_templates ON public.email_templates
  FOR ALL TO authenticated
  USING (public.is_ccc_user())
  WITH CHECK (public.is_ccc_user());

DROP POLICY IF EXISTS "ccc_admin can manage recommendation templates" ON public.recommendation_templates;
DROP POLICY IF EXISTS ccc_admin_manage_recommendation_templates ON public.recommendation_templates;
CREATE POLICY ccc_admin_manage_recommendation_templates
  ON public.recommendation_templates FOR ALL
  TO authenticated
  USING (public.is_ccc_admin())
  WITH CHECK (public.is_ccc_admin());

DROP POLICY IF EXISTS "ccc_users_manage_recipients" ON public.survey_recipients;
DROP POLICY IF EXISTS "client_users_read_recipients" ON public.survey_recipients;
DROP POLICY IF EXISTS ccc_users_manage_recipients ON public.survey_recipients;
DROP POLICY IF EXISTS client_users_read_recipients ON public.survey_recipients;
CREATE POLICY ccc_users_manage_recipients
  ON public.survey_recipients FOR ALL
  TO authenticated
  USING (public.is_ccc_user())
  WITH CHECK (public.is_ccc_user());
CREATE POLICY client_users_read_recipients
  ON public.survey_recipients FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
        FROM public.org_members om
        JOIN public.surveys s ON s.organization_id = om.organization_id
       WHERE om.user_id = auth.uid()
         AND s.id = survey_recipients.survey_id
         AND om.role IN (
           'client_exec'::public.user_role,
           'client_director'::public.user_role,
           'client_manager'::public.user_role
         )
    )
  );

-- ============================================================================
-- Client result access below the route layer
-- ============================================================================

DROP POLICY IF EXISTS "client_read_own_scores" ON public.scores;
DROP POLICY IF EXISTS client_read_scores_with_results_access ON public.scores;
CREATE POLICY client_read_scores_with_results_access ON public.scores
  FOR SELECT TO authenticated
  USING (public.can_read_results(survey_id));

DROP POLICY IF EXISTS "client_read_own_recs" ON public.recommendations;
DROP POLICY IF EXISTS client_read_recs_with_results_access ON public.recommendations;
CREATE POLICY client_read_recs_with_results_access ON public.recommendations
  FOR SELECT TO authenticated
  USING (public.can_read_results(survey_id));

DROP POLICY IF EXISTS "client_read_own_keywords" ON public.dialogue_keywords;
DROP POLICY IF EXISTS client_read_keywords_with_results_access ON public.dialogue_keywords;
CREATE POLICY client_read_keywords_with_results_access ON public.dialogue_keywords
  FOR SELECT TO authenticated
  USING (public.can_read_results(survey_id));

DROP POLICY IF EXISTS "ccc_users_read_embeddings" ON public.dialogue_embeddings;
DROP POLICY IF EXISTS "client_users_read_own_embeddings" ON public.dialogue_embeddings;
DROP POLICY IF EXISTS ccc_users_read_embeddings ON public.dialogue_embeddings;
DROP POLICY IF EXISTS client_read_embeddings_with_results_access ON public.dialogue_embeddings;
CREATE POLICY ccc_users_read_embeddings ON public.dialogue_embeddings
  FOR SELECT TO authenticated
  USING (public.is_ccc_user());
CREATE POLICY client_read_embeddings_with_results_access ON public.dialogue_embeddings
  FOR SELECT TO authenticated
  USING (public.can_read_results(survey_id));

-- ============================================================================
-- Token-bound anonymous survey surface
-- ============================================================================

DROP POLICY IF EXISTS "anon_read_active_deployments" ON public.deployments;
DROP POLICY IF EXISTS "anon_read_active_questions" ON public.questions;
DROP POLICY IF EXISTS "anon_read_active_surveys" ON public.surveys;
DROP POLICY IF EXISTS "anon_read_surveys_with_active_deployment" ON public.surveys;
DROP POLICY IF EXISTS "anon_read_question_dimensions" ON public.question_dimensions;

CREATE OR REPLACE FUNCTION public.resolve_deployment_by_token(p_token TEXT)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT jsonb_build_object(
    'deployment', to_jsonb(d),
    'survey', to_jsonb(s)
  )
    FROM public.deployments d
    JOIN public.surveys s ON s.id = d.survey_id
   WHERE d.token::text = p_token
     AND d.is_active = true
     AND s.status IN ('active'::public.survey_status, 'closed'::public.survey_status)
   LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_questions_for_deployment_token(
  p_token TEXT,
  p_survey_id UUID
)
RETURNS TABLE (
  id UUID,
  survey_id UUID,
  text TEXT,
  type public.question_type,
  order_index INT,
  reverse_scored BOOLEAN,
  required BOOLEAN,
  created_at TIMESTAMPTZ,
  sub_dimension_id UUID,
  question_dimensions jsonb
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT
    q.id,
    q.survey_id,
    q.text,
    q.type,
    q.order_index,
    q.reverse_scored,
    q.required,
    q.created_at,
    q.sub_dimension_id,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'question_id', qd.question_id,
          'dimension_id', qd.dimension_id,
          'weight', qd.weight
        )
        ORDER BY qd.dimension_id
      ) FILTER (WHERE qd.question_id IS NOT NULL),
      '[]'::jsonb
    ) AS question_dimensions
    FROM public.deployments d
    JOIN public.surveys s ON s.id = d.survey_id
    JOIN public.questions q ON q.survey_id = s.id
    LEFT JOIN public.question_dimensions qd ON qd.question_id = q.id
   WHERE d.token::text = p_token
     AND s.id = p_survey_id
     AND d.is_active = true
     AND s.status = 'active'::public.survey_status
     AND (d.opens_at IS NULL OR d.opens_at <= now())
     AND (d.closes_at IS NULL OR d.closes_at > now())
   GROUP BY q.id, q.survey_id, q.text, q.type, q.order_index,
            q.reverse_scored, q.required, q.created_at, q.sub_dimension_id
   ORDER BY q.order_index ASC;
$$;

REVOKE ALL ON FUNCTION public.resolve_deployment_by_token(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_questions_for_deployment_token(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_deployment_by_token(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_questions_for_deployment_token(TEXT, UUID) TO anon, authenticated;

-- ============================================================================
-- Session-token bound answer writes
-- ============================================================================

CREATE OR REPLACE FUNCTION public.response_session_matches_header(resp_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.responses r
     WHERE r.id = resp_id
       AND r.session_token = current_setting('request.headers', true)::json->>'x-session-token'
  );
$$;

DROP POLICY IF EXISTS "anon_insert_answers" ON public.answers;
CREATE POLICY "anon_insert_answers" ON public.answers FOR INSERT
  WITH CHECK (
    auth.role() = 'anon'
    AND public.is_valid_response(response_id)
    AND public.response_session_matches_header(response_id)
  );

DROP POLICY IF EXISTS "anon_update_own_answers" ON public.answers;
CREATE POLICY "anon_update_own_answers" ON public.answers FOR UPDATE
  USING (
    auth.role() = 'anon'
    AND public.is_valid_response(response_id)
    AND public.response_session_matches_header(response_id)
  )
  WITH CHECK (
    auth.role() = 'anon'
    AND public.is_valid_response(response_id)
    AND public.response_session_matches_header(response_id)
  );

DROP POLICY IF EXISTS "authenticated_insert_answers" ON public.answers;
CREATE POLICY "authenticated_insert_answers" ON public.answers FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND public.is_valid_response(response_id)
    AND public.response_session_matches_header(response_id)
  );

DROP POLICY IF EXISTS "authenticated_update_own_answers" ON public.answers;
CREATE POLICY "authenticated_update_own_answers" ON public.answers FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND public.is_valid_response(response_id)
    AND public.response_session_matches_header(response_id)
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND public.is_valid_response(response_id)
    AND public.response_session_matches_header(response_id)
  );

DROP POLICY IF EXISTS "anon_update_own_responses" ON public.responses;
CREATE POLICY "anon_update_own_responses" ON public.responses FOR UPDATE
  USING (
    auth.role() = 'anon'
    AND is_complete = false
    AND public.is_valid_deployment(deployment_id)
    AND session_token = current_setting('request.headers', true)::json->>'x-session-token'
  )
  WITH CHECK (
    auth.role() = 'anon'
    AND public.is_valid_deployment(deployment_id)
    AND session_token = current_setting('request.headers', true)::json->>'x-session-token'
  );

DROP POLICY IF EXISTS "authenticated_update_own_responses" ON public.responses;
CREATE POLICY "authenticated_update_own_responses" ON public.responses FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND is_complete = false
    AND public.is_valid_deployment(deployment_id)
    AND session_token = current_setting('request.headers', true)::json->>'x-session-token'
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND public.is_valid_deployment(deployment_id)
    AND session_token = current_setting('request.headers', true)::json->>'x-session-token'
  );

REVOKE ALL ON FUNCTION public.response_session_matches_header(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.response_session_matches_header(UUID) TO anon, authenticated, service_role;

-- ============================================================================
-- Authorized reporting views and RPCs
-- ============================================================================

DROP VIEW IF EXISTS public.dialogue_responses;
CREATE VIEW public.dialogue_responses
WITH (security_barrier = true)
AS
SELECT
  a.id,
  s.id AS survey_id,
  s.organization_id,
  q.id AS question_id,
  q.text AS question_text,
  a.open_text_value AS response_text,
  r.metadata_department,
  r.metadata_role,
  r.metadata_location,
  r.metadata_tenure,
  r.submitted_at,
  r.submitted_at AS created_at
FROM public.answers a
JOIN public.responses r ON r.id = a.response_id
JOIN public.questions q ON q.id = a.question_id
JOIN public.deployments dep ON dep.id = r.deployment_id
JOIN public.surveys s ON s.id = dep.survey_id
WHERE a.open_text_value IS NOT NULL
  AND r.is_complete = true
  AND public.can_read_results(s.id);

DROP VIEW IF EXISTS public.question_scores;
CREATE VIEW public.question_scores
WITH (security_barrier = true)
AS
SELECT
  q.survey_id,
  q.id AS question_id,
  q.text AS question_text,
  q.order_index,
  q.type AS question_type,
  q.reverse_scored AS is_reverse_scored,
  q.sub_dimension_id,
  sd.code AS sub_dimension_code,
  sd.name AS sub_dimension_name,
  d.id AS dimension_id,
  d.code AS dimension_code,
  d.name AS dimension_name,
  d.color AS dimension_color,
  COUNT(a.id) FILTER (WHERE a.likert_value IS NOT NULL) AS response_count,
  AVG(a.likert_value) FILTER (WHERE a.likert_value IS NOT NULL) AS mean_score,
  COUNT(a.id) FILTER (WHERE a.likert_value = 1) AS dist_1,
  COUNT(a.id) FILTER (WHERE a.likert_value = 2) AS dist_2,
  COUNT(a.id) FILTER (WHERE a.likert_value = 3) AS dist_3,
  COUNT(a.id) FILTER (WHERE a.likert_value = 4) AS dist_4,
  COUNT(a.id) FILTER (WHERE a.likert_value = 5) AS dist_5,
  COUNT(a.id) FILTER (WHERE a.likert_value = 6) AS dist_6,
  COUNT(a.id) FILTER (WHERE a.likert_value = 7) AS dist_7,
  COUNT(a.id) FILTER (WHERE a.likert_value = 8) AS dist_8,
  COUNT(a.id) FILTER (WHERE a.likert_value = 9) AS dist_9,
  COUNT(a.id) FILTER (WHERE a.likert_value = 10) AS dist_10
FROM public.questions q
JOIN public.question_dimensions qd ON qd.question_id = q.id
JOIN public.dimensions d ON d.id = qd.dimension_id
LEFT JOIN public.sub_dimensions sd ON sd.id = q.sub_dimension_id
LEFT JOIN public.answers a ON a.question_id = q.id
  AND a.response_id IN (
    SELECT r.id FROM public.responses r WHERE r.is_complete = true
  )
WHERE public.can_read_results(q.survey_id)
GROUP BY q.survey_id, q.id, q.text, q.order_index, q.type, q.reverse_scored,
         q.sub_dimension_id, sd.code, sd.name,
         d.id, d.code, d.name, d.color;

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
  CASE
    WHEN s.response_count >= COALESCE(
      (SELECT (o.settings->>'anonymityThreshold')::int
       FROM public.organizations o
       JOIN public.surveys sv ON sv.organization_id = o.id
       WHERE sv.id = s.survey_id),
      5
    )
    THEN s.score
    ELSE NULL
  END AS score,
  CASE
    WHEN s.response_count >= COALESCE(
      (SELECT (o.settings->>'anonymityThreshold')::int
       FROM public.organizations o
       JOIN public.surveys sv ON sv.organization_id = o.id
       WHERE sv.id = s.survey_id),
      5
    )
    THEN s.raw_score
    ELSE NULL
  END AS raw_score,
  CASE
    WHEN s.response_count >= COALESCE(
      (SELECT (o.settings->>'anonymityThreshold')::int
       FROM public.organizations o
       JOIN public.surveys sv ON sv.organization_id = o.id
       WHERE sv.id = s.survey_id),
      5
    )
    THEN s.response_count
    ELSE NULL
  END AS response_count,
  s.response_count < COALESCE(
    (SELECT (o.settings->>'anonymityThreshold')::int
     FROM public.organizations o
     JOIN public.surveys sv ON sv.organization_id = o.id
     WHERE sv.id = s.survey_id),
    5
  ) AS is_masked
FROM public.scores s
JOIN public.dimensions d ON d.id = s.dimension_id
WHERE public.can_read_results(s.survey_id);

DROP VIEW IF EXISTS public.active_survey_per_org;
CREATE VIEW public.active_survey_per_org
WITH (security_barrier = true)
AS
SELECT DISTINCT ON (s.organization_id)
  s.id AS survey_id,
  s.organization_id,
  s.title,
  s.status,
  s.opens_at,
  s.closes_at,
  s.scores_calculated,
  (SELECT count(*) FROM public.responses r
   JOIN public.deployments dep ON dep.id = r.deployment_id
   WHERE dep.survey_id = s.id AND r.is_complete = true
  ) AS total_responses,
  (SELECT count(*) FROM public.deployments dep
   WHERE dep.survey_id = s.id AND dep.is_active = true
  ) AS active_deployments
FROM public.surveys s
WHERE s.status IN ('active', 'closed')
  AND (
    public.is_ccc_user()
    OR EXISTS (
      SELECT 1
        FROM public.org_members om
       WHERE om.user_id = auth.uid()
         AND om.organization_id = s.organization_id
    )
  )
ORDER BY s.organization_id, s.closes_at DESC NULLS LAST;

GRANT SELECT ON public.dialogue_responses TO authenticated;
GRANT SELECT ON public.question_scores TO authenticated;
GRANT SELECT ON public.safe_segment_scores TO authenticated;
GRANT SELECT ON public.active_survey_per_org TO authenticated;

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
BEGIN
  IF NOT public.can_read_results(p_survey_id) THEN
    RAISE EXCEPTION 'Caller is not permitted to read response metrics for survey %', p_survey_id
      USING ERRCODE = '42501';
  END IF;

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

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object('department', department, 'count', cnt)
      ORDER BY cnt DESC, department ASC
    ),
    '[]'::jsonb
  )
    INTO v_department_breakdown
    FROM (
      SELECT COALESCE(NULLIF(r.metadata_department, ''), 'Unknown') AS department,
             COUNT(*) AS cnt
        FROM public.responses r
        JOIN public.deployments d ON d.id = r.deployment_id
       WHERE d.survey_id = p_survey_id
       GROUP BY 1
    ) sub;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object('date', date, 'count', cnt)
      ORDER BY date ASC
    ),
    '[]'::jsonb
  )
    INTO v_daily_completions
    FROM (
      SELECT to_char(r.submitted_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date,
             COUNT(*) AS cnt
        FROM public.responses r
        JOIN public.deployments d ON d.id = r.deployment_id
       WHERE d.survey_id = p_survey_id
         AND r.is_complete = true
         AND r.submitted_at IS NOT NULL
       GROUP BY 1
    ) sub;

  RETURN jsonb_build_object(
    'totalResponses', v_total,
    'completedResponses', v_completed,
    'completionRate', v_completion_rate,
    'averageCompletionTimeMs', v_avg_duration_ms,
    'departmentBreakdown', v_department_breakdown,
    'dailyCompletions', v_daily_completions
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
    SELECT COALESCE(
      (SELECT (o.settings->>'anonymityThreshold')::int
       FROM public.organizations o
       JOIN public.surveys sv ON sv.organization_id = o.id
       WHERE sv.id = p_survey_id),
      5
    ) AS val
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
    COUNT(a.id) FILTER (WHERE a.likert_value IS NOT NULL) AS response_count,
    AVG(a.likert_value) FILTER (WHERE a.likert_value IS NOT NULL) AS mean_score,
    COUNT(a.id) FILTER (WHERE a.likert_value = 1) AS dist_1,
    COUNT(a.id) FILTER (WHERE a.likert_value = 2) AS dist_2,
    COUNT(a.id) FILTER (WHERE a.likert_value = 3) AS dist_3,
    COUNT(a.id) FILTER (WHERE a.likert_value = 4) AS dist_4,
    COUNT(a.id) FILTER (WHERE a.likert_value = 5) AS dist_5,
    COUNT(a.id) FILTER (WHERE a.likert_value = 6) AS dist_6,
    COUNT(a.id) FILTER (WHERE a.likert_value = 7) AS dist_7,
    COUNT(a.id) FILTER (WHERE a.likert_value = 8) AS dist_8,
    COUNT(a.id) FILTER (WHERE a.likert_value = 9) AS dist_9,
    COUNT(a.id) FILTER (WHERE a.likert_value = 10) AS dist_10,
    (SELECT total FROM segment_respondent_count) < (SELECT val FROM threshold) AS is_masked
  FROM public.questions q
  JOIN public.question_dimensions qd ON qd.question_id = q.id
  JOIN public.dimensions d ON d.id = qd.dimension_id
  LEFT JOIN public.sub_dimensions sd ON sd.id = q.sub_dimension_id
  LEFT JOIN public.answers a ON a.question_id = q.id
    AND a.response_id IN (SELECT id FROM segment_responses)
  WHERE q.survey_id = p_survey_id
  GROUP BY q.id, q.text, q.order_index, q.reverse_scored,
           q.sub_dimension_id, sd.code, sd.name,
           d.id, d.code, d.name, d.color;
END;
$$;

REVOKE ALL ON FUNCTION public.get_response_metrics(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_segment_question_scores(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_response_metrics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_segment_question_scores(UUID, TEXT, TEXT) TO authenticated;

-- ============================================================================
-- Logo storage ownership and MIME hardening
-- ============================================================================

UPDATE storage.buckets
   SET allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp']
 WHERE id = 'logos';

CREATE OR REPLACE FUNCTION public.storage_object_org_id(p_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_first_segment TEXT;
BEGIN
  v_first_segment := split_part(p_name, '/', 1);
  RETURN v_first_segment::uuid;
EXCEPTION WHEN invalid_text_representation THEN
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.storage_object_org_id(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.storage_object_org_id(TEXT) TO authenticated, service_role;

DROP POLICY IF EXISTS "Authenticated users can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete logos" ON storage.objects;
DROP POLICY IF EXISTS logos_authenticated_insert ON storage.objects;
DROP POLICY IF EXISTS logos_authenticated_update ON storage.objects;
DROP POLICY IF EXISTS logos_authenticated_delete ON storage.objects;

CREATE POLICY logos_authenticated_insert
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'logos'
    AND public.can_manage_org(public.storage_object_org_id(name))
  );

CREATE POLICY logos_authenticated_update
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'logos'
    AND public.can_manage_org(public.storage_object_org_id(name))
  )
  WITH CHECK (
    bucket_id = 'logos'
    AND public.can_manage_org(public.storage_object_org_id(name))
  );

CREATE POLICY logos_authenticated_delete
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'logos'
    AND public.can_manage_org(public.storage_object_org_id(name))
  );
