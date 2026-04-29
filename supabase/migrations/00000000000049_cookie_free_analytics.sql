-- Cookie-free aggregate analytics.
--
-- ADR-007 explicitly forbids analytics cookies, visitor IDs, raw IPs, raw user
-- agents, survey tokens, full URLs, answer values, open text, and raw event
-- retention. This migration stores daily aggregate counters only.

CREATE TABLE public.analytics_daily_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_date DATE NOT NULL DEFAULT ((now() AT TIME ZONE 'UTC')::date),
  event_name TEXT NOT NULL CHECK (
    event_name IN (
      'route_viewed',
      'survey_deployment_resolved',
      'survey_edge_state_viewed',
      'survey_started',
      'survey_resumed',
      'survey_progress_saved',
      'survey_open_text_submitted',
      'survey_open_text_skipped',
      'survey_completed',
      'admin_client_selected',
      'survey_created',
      'survey_config_saved',
      'survey_published',
      'survey_unpublished',
      'survey_link_copied',
      'results_tab_viewed',
      'report_generation_requested',
      'report_download_requested'
    )
  ),
  surface TEXT NOT NULL CHECK (
    surface IN (
      'public',
      'auth',
      'survey',
      'admin',
      'dashboard',
      'results',
      'reports',
      'settings',
      'help',
      'profile',
      'dev'
    )
  ),
  route_template TEXT CHECK (
    route_template IS NULL OR route_template IN (
      '/',
      '/auth/login',
      '/auth/callback',
      '/auth/forgot-password',
      '/auth/forgot-password/sent',
      '/auth/reset-password',
      '/auth/accept-invite',
      '/clients',
      '/clients/$orgId',
      '/clients/$orgId/overview',
      '/clients/$orgId/surveys',
      '/clients/$orgId/users',
      '/clients/$orgId/settings',
      '/surveys/$surveyId',
      '/surveys/$surveyId/publish',
      '/users',
      '/recommendations',
      '/email-log',
      '/email-templates',
      '/analytics',
      '/dashboard',
      '/results/$surveyId',
      '/results/$surveyId/compass',
      '/results/$surveyId/survey',
      '/results/$surveyId/groups',
      '/results/$surveyId/dialogue',
      '/results/$surveyId/reports',
      '/results/$surveyId/recommendations',
      '/results/$surveyId/history',
      '/reports/$surveyId',
      '/settings',
      '/help',
      '/profile',
      '/s/$token',
      '/s/$token/q/$index',
      '/s/$token/open',
      '/s/$token/complete',
      '/s/$token/saved',
      '/dev/scoring',
      '*'
    )
  ),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  survey_id UUID REFERENCES public.surveys(id) ON DELETE CASCADE,
  deployment_id UUID REFERENCES public.deployments(id) ON DELETE CASCADE,
  tier TEXT CHECK (tier IS NULL OR tier IN ('tier_1', 'tier_2')),
  role public.user_role,
  report_format TEXT CHECK (report_format IS NULL OR report_format IN ('pdf', 'docx', 'pptx')),
  results_tab TEXT CHECK (
    results_tab IS NULL OR results_tab IN (
      'compass',
      'survey',
      'groups',
      'dialogue',
      'reports',
      'recommendations',
      'history'
    )
  ),
  survey_resolution_status TEXT CHECK (
    survey_resolution_status IS NULL OR survey_resolution_status IN (
      'valid',
      'not_found',
      'closed',
      'expired',
      'not_yet_open',
      'already_completed',
      'error'
    )
  ),
  action_status TEXT CHECK (
    action_status IS NULL OR action_status IN (
      'requested',
      'succeeded',
      'failed',
      'canceled'
    )
  ),
  build_env TEXT CHECK (
    build_env IS NULL OR build_env IN ('development', 'preview', 'production', 'test')
  ),
  app_version TEXT CHECK (app_version IS NULL OR length(app_version) <= 80),
  event_count BIGINT NOT NULL DEFAULT 0 CHECK (event_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT analytics_daily_counts_unique_dimension
    UNIQUE NULLS NOT DISTINCT (
      event_date,
      event_name,
      surface,
      route_template,
      organization_id,
      survey_id,
      deployment_id,
      tier,
      role,
      report_format,
      results_tab,
      survey_resolution_status,
      action_status,
      build_env,
      app_version
    )
);

CREATE TRIGGER analytics_daily_counts_updated_at
  BEFORE UPDATE ON public.analytics_daily_counts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX analytics_daily_counts_date_event_idx
  ON public.analytics_daily_counts (event_date DESC, event_name);

CREATE INDEX analytics_daily_counts_org_date_idx
  ON public.analytics_daily_counts (organization_id, event_date DESC)
  WHERE organization_id IS NOT NULL;

ALTER TABLE public.analytics_daily_counts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.analytics_daily_counts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.analytics_daily_counts TO service_role;

CREATE OR REPLACE FUNCTION public.analytics_normalize_field_name(p_field_name TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog, public
AS $$
  SELECT lower(regexp_replace(p_field_name, '[^a-zA-Z0-9]', '', 'g'));
$$;

CREATE OR REPLACE FUNCTION public.analytics_forbidden_field_paths(
  p_payload jsonb,
  p_prefix TEXT DEFAULT ''
)
RETURNS TEXT[]
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_forbidden CONSTANT TEXT[] := ARRAY[
    'answer',
    'answervalue',
    'answers',
    'browserfingerprint',
    'deploymenttoken',
    'devicefingerprint',
    'email',
    'fingerprint',
    'fullurl',
    'hash',
    'invitationtoken',
    'ip',
    'ipaddress',
    'iphash',
    'opentext',
    'path',
    'query',
    'rawip',
    'rawuseragent',
    'recipientemail',
    'reporturl',
    'sessioncookie',
    'sessiontoken',
    'signedurl',
    'storagepath',
    'surveytoken',
    'text',
    'token',
    'url',
    'useragent',
    'useremail',
    'userid',
    'visitorid'
  ];
  v_findings TEXT[] := ARRAY[]::TEXT[];
  v_key TEXT;
  v_value jsonb;
  v_path TEXT;
  v_array_value jsonb;
  v_index INT;
BEGIN
  IF p_payload IS NULL THEN
    RETURN v_findings;
  END IF;

  IF jsonb_typeof(p_payload) = 'object' THEN
    FOR v_key, v_value IN SELECT key, value FROM jsonb_each(p_payload)
    LOOP
      v_path := CASE
        WHEN p_prefix = '' THEN v_key
        ELSE p_prefix || '.' || v_key
      END;

      IF public.analytics_normalize_field_name(v_key) = ANY (v_forbidden) THEN
        v_findings := array_append(v_findings, v_path);
      END IF;

      v_findings := v_findings || public.analytics_forbidden_field_paths(v_value, v_path);
    END LOOP;
  ELSIF jsonb_typeof(p_payload) = 'array' THEN
    FOR v_array_value, v_index IN
      SELECT value, ordinality::INT - 1
        FROM jsonb_array_elements(p_payload) WITH ORDINALITY
    LOOP
      v_findings := v_findings || public.analytics_forbidden_field_paths(
        v_array_value,
        p_prefix || '[' || v_index::TEXT || ']'
      );
    END LOOP;
  END IF;

  RETURN v_findings;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_analytics_event(
  p_event jsonb,
  p_occurred_at TIMESTAMPTZ DEFAULT now()
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_allowed_keys CONSTANT TEXT[] := ARRAY[
    'eventName',
    'surface',
    'routeTemplate',
    'organizationId',
    'surveyId',
    'deploymentId',
    'tier',
    'role',
    'reportFormat',
    'resultsTab',
    'surveyResolutionStatus',
    'actionStatus',
    'buildEnv',
    'appVersion'
  ];
  v_forbidden_paths TEXT[];
  v_key TEXT;
  v_event_name TEXT;
  v_surface TEXT;
  v_route_template TEXT;
  v_organization_id UUID;
  v_survey_id UUID;
  v_deployment_id UUID;
  v_tier TEXT;
  v_role public.user_role;
  v_report_format TEXT;
  v_results_tab TEXT;
  v_survey_resolution_status TEXT;
  v_action_status TEXT;
  v_build_env TEXT;
  v_app_version TEXT;
  v_event_date DATE;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Only service_role may record analytics events'
      USING ERRCODE = '42501';
  END IF;

  IF p_event IS NULL OR jsonb_typeof(p_event) <> 'object' THEN
    RAISE EXCEPTION 'Analytics event payload must be a JSON object'
      USING ERRCODE = '22023';
  END IF;

  v_forbidden_paths := public.analytics_forbidden_field_paths(p_event);
  IF array_length(v_forbidden_paths, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'Analytics event payload contains forbidden fields: %', array_to_string(v_forbidden_paths, ', ')
      USING ERRCODE = '22023';
  END IF;

  FOR v_key IN SELECT jsonb_object_keys(p_event)
  LOOP
    IF NOT v_key = ANY (v_allowed_keys) THEN
      RAISE EXCEPTION 'Analytics event payload contains unsupported field: %', v_key
        USING ERRCODE = '22023';
    END IF;
  END LOOP;

  v_event_name := p_event->>'eventName';
  v_surface := p_event->>'surface';
  v_route_template := NULLIF(p_event->>'routeTemplate', '');
  v_organization_id := NULLIF(p_event->>'organizationId', '')::UUID;
  v_survey_id := NULLIF(p_event->>'surveyId', '')::UUID;
  v_deployment_id := NULLIF(p_event->>'deploymentId', '')::UUID;
  v_tier := NULLIF(p_event->>'tier', '');
  v_role := NULLIF(p_event->>'role', '')::public.user_role;
  v_report_format := NULLIF(p_event->>'reportFormat', '');
  v_results_tab := NULLIF(p_event->>'resultsTab', '');
  v_survey_resolution_status := NULLIF(p_event->>'surveyResolutionStatus', '');
  v_action_status := NULLIF(p_event->>'actionStatus', '');
  v_build_env := NULLIF(p_event->>'buildEnv', '');
  v_app_version := NULLIF(p_event->>'appVersion', '');
  v_event_date := (p_occurred_at AT TIME ZONE 'UTC')::DATE;

  IF v_event_name IS NULL THEN
    RAISE EXCEPTION 'eventName is required'
      USING ERRCODE = '22023';
  END IF;

  IF v_surface IS NULL THEN
    RAISE EXCEPTION 'surface is required'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.analytics_daily_counts (
    event_date,
    event_name,
    surface,
    route_template,
    organization_id,
    survey_id,
    deployment_id,
    tier,
    role,
    report_format,
    results_tab,
    survey_resolution_status,
    action_status,
    build_env,
    app_version,
    event_count
  ) VALUES (
    v_event_date,
    v_event_name,
    v_surface,
    v_route_template,
    v_organization_id,
    v_survey_id,
    v_deployment_id,
    v_tier,
    v_role,
    v_report_format,
    v_results_tab,
    v_survey_resolution_status,
    v_action_status,
    v_build_env,
    v_app_version,
    1
  )
  ON CONFLICT ON CONSTRAINT analytics_daily_counts_unique_dimension
  DO UPDATE SET
    event_count = public.analytics_daily_counts.event_count + 1,
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.get_analytics_summary(
  p_start_date DATE DEFAULT (current_date - 30),
  p_end_date DATE DEFAULT current_date
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_summary jsonb;
  v_min_reportable CONSTANT INT := 5;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' AND NOT public.is_ccc_user() THEN
    RAISE EXCEPTION 'Caller is not permitted to read analytics summary'
      USING ERRCODE = '42501';
  END IF;

  IF p_start_date > p_end_date THEN
    RAISE EXCEPTION 'start date must be on or before end date'
      USING ERRCODE = '22023';
  END IF;

  WITH filtered AS (
    SELECT *
      FROM public.analytics_daily_counts
     WHERE event_date BETWEEN p_start_date AND p_end_date
  )
  SELECT jsonb_build_object(
    'startDate', p_start_date,
    'endDate', p_end_date,
    'minimumReportableCount', v_min_reportable,
    'totalEvents', COALESCE((SELECT SUM(event_count) FROM filtered), 0),
    'routeViews', COALESCE((SELECT SUM(event_count) FROM filtered WHERE event_name = 'route_viewed'), 0),
    'surveyStarts', COALESCE((SELECT SUM(event_count) FROM filtered WHERE event_name = 'survey_started'), 0),
    'surveyCompletions', COALESCE((SELECT SUM(event_count) FROM filtered WHERE event_name = 'survey_completed'), 0),
    'reportGenerations', COALESCE((SELECT SUM(event_count) FROM filtered WHERE event_name = 'report_generation_requested'), 0),
    'reportDownloads', COALESCE((SELECT SUM(event_count) FROM filtered WHERE event_name = 'report_download_requested'), 0),
    'activeOrganizations', COALESCE((SELECT COUNT(DISTINCT organization_id) FROM filtered WHERE organization_id IS NOT NULL), 0),
    'activeSurveys', COALESCE((SELECT COUNT(DISTINCT survey_id) FROM filtered WHERE survey_id IS NOT NULL), 0),
    'byEvent', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('eventName', event_name, 'count', total) ORDER BY total DESC, event_name)
        FROM (
          SELECT event_name, SUM(event_count) AS total
            FROM filtered
           GROUP BY event_name
        ) grouped
    ), '[]'::jsonb),
    'bySurface', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('surface', surface, 'count', total) ORDER BY total DESC, surface)
        FROM (
          SELECT surface, SUM(event_count) AS total
            FROM filtered
           GROUP BY surface
        ) grouped
    ), '[]'::jsonb),
    'routeViewsByRoute', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('routeTemplate', route_template, 'count', total) ORDER BY total DESC, route_template)
        FROM (
          SELECT route_template, SUM(event_count) AS total
            FROM filtered
           WHERE event_name = 'route_viewed'
             AND route_template IS NOT NULL
           GROUP BY route_template
        ) grouped
    ), '[]'::jsonb),
    'resultsTabs', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('resultsTab', results_tab, 'count', total) ORDER BY total DESC, results_tab)
        FROM (
          SELECT results_tab, SUM(event_count) AS total
            FROM filtered
           WHERE results_tab IS NOT NULL
           GROUP BY results_tab
        ) grouped
    ), '[]'::jsonb),
    'surveyResolutionStatuses', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('status', survey_resolution_status, 'count', total) ORDER BY total DESC, survey_resolution_status)
        FROM (
          SELECT survey_resolution_status, SUM(event_count) AS total
            FROM filtered
           WHERE survey_resolution_status IS NOT NULL
           GROUP BY survey_resolution_status
        ) grouped
    ), '[]'::jsonb),
    'actionStatuses', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'eventName', event_name,
          'actionStatus', action_status,
          'count', total
        )
        ORDER BY event_name, action_status
      )
        FROM (
          SELECT event_name, action_status, SUM(event_count) AS total
            FROM filtered
           WHERE action_status IS NOT NULL
           GROUP BY event_name, action_status
        ) grouped
    ), '[]'::jsonb),
    'reportFormats', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('reportFormat', report_format, 'count', total) ORDER BY total DESC, report_format)
        FROM (
          SELECT report_format, SUM(event_count) AS total
            FROM filtered
           WHERE report_format IS NOT NULL
           GROUP BY report_format
        ) grouped
    ), '[]'::jsonb),
    'topOrganizations', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'organizationId', organization_id,
          'organizationName', organization_name,
          'count', total
        )
        ORDER BY total DESC, organization_name
      )
        FROM (
          SELECT
            f.organization_id,
            o.name AS organization_name,
            SUM(f.event_count) AS total
          FROM filtered f
          JOIN public.organizations o ON o.id = f.organization_id
          GROUP BY f.organization_id, o.name
          HAVING SUM(f.event_count) >= v_min_reportable
        ) grouped
    ), '[]'::jsonb),
    'dailyTotals', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('date', event_date, 'count', total) ORDER BY event_date)
        FROM (
          SELECT event_date, SUM(event_count) AS total
            FROM filtered
           GROUP BY event_date
        ) grouped
    ), '[]'::jsonb)
  )
    INTO v_summary;

  RETURN v_summary;
END;
$$;

REVOKE ALL ON FUNCTION public.analytics_normalize_field_name(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.analytics_forbidden_field_paths(jsonb, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_analytics_event(jsonb, TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_analytics_summary(DATE, DATE) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.analytics_forbidden_field_paths(jsonb, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_analytics_event(jsonb, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_analytics_summary(DATE, DATE) TO authenticated, service_role;
