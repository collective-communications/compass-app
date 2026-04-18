-- Aggregate response metrics for a survey in a single round trip.
--
-- Replaces a client-side pattern that fetched every response row, plus every
-- deployment row, and folded the aggregations in JavaScript. The JS path grew
-- linearly with response volume and blocked the admin response tracker UI
-- while the payload deserialised. Pushing the aggregation into Postgres is
-- O(n) over the same rows but avoids the wire transfer and JSON parsing, and
-- lets the query planner use the existing indexes on
-- deployments(survey_id) and responses(deployment_id).
--
-- Shape is tuned to match the `ResponseMetrics` TypeScript interface in
-- `apps/web/src/features/admin/surveys/services/deployment-service.ts`:
--   {
--     totalResponses, completedResponses, completionRate,
--     averageCompletionTimeMs,
--     departmentBreakdown: [{ department, count }, ...] (sorted desc by count),
--     dailyCompletions:   [{ date, count }, ...]       (sorted asc by date)
--   }
--
-- SECURITY DEFINER with a pinned search_path because callers are admin-only
-- UI paths that already hold RLS-scoped access to their own surveys, and the
-- function body only touches rows reachable from the input survey_id. The
-- function is STABLE — no side effects, pure read.

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
  -- Single pass: count totals and completeds from the survey's deployments.
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE r.is_complete = true)
  INTO v_total, v_completed
  FROM responses r
  JOIN deployments d ON d.id = r.deployment_id
  WHERE d.survey_id = p_survey_id;

  v_completion_rate := CASE
    WHEN v_total > 0 THEN (v_completed::NUMERIC / v_total::NUMERIC) * 100
    ELSE 0
  END;

  -- Average completion duration in milliseconds, over completed responses
  -- that have a submitted_at timestamp. Matches the JS fallback behaviour of
  -- returning null when no completed+submitted rows exist.
  SELECT AVG(EXTRACT(EPOCH FROM (r.submitted_at - r.created_at)) * 1000)
  INTO v_avg_duration_ms
  FROM responses r
  JOIN deployments d ON d.id = r.deployment_id
  WHERE d.survey_id = p_survey_id
    AND r.is_complete = true
    AND r.submitted_at IS NOT NULL;

  -- Department breakdown (ordered desc by count). Missing metadata maps to
  -- the literal 'Unknown' bucket, matching prior JS behaviour.
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object('department', department, 'count', cnt)
      ORDER BY cnt DESC, department ASC
    ),
    '[]'::jsonb
  )
  INTO v_department_breakdown
  FROM (
    SELECT
      COALESCE(NULLIF(r.metadata_department, ''), 'Unknown') AS department,
      COUNT(*) AS cnt
    FROM responses r
    JOIN deployments d ON d.id = r.deployment_id
    WHERE d.survey_id = p_survey_id
    GROUP BY 1
  ) sub;

  -- Daily completions (ordered asc by date). Keyed on the UTC date portion of
  -- submitted_at — same truncation the JS path performed via `.slice(0, 10)`.
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object('date', date, 'count', cnt)
      ORDER BY date ASC
    ),
    '[]'::jsonb
  )
  INTO v_daily_completions
  FROM (
    SELECT
      to_char(r.submitted_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date,
      COUNT(*) AS cnt
    FROM responses r
    JOIN deployments d ON d.id = r.deployment_id
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

GRANT EXECUTE ON FUNCTION public.get_response_metrics(UUID) TO authenticated;
