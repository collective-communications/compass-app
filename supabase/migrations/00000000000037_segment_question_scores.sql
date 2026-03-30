-- Segment-filtered per-question score aggregations.
-- Same computation as the question_scores view but filtered by respondent
-- metadata segment (department, role, location, tenure) with anonymity
-- threshold enforcement via is_masked flag.

CREATE OR REPLACE FUNCTION get_segment_question_scores(
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
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  WITH threshold AS (
    SELECT COALESCE(
      (SELECT (o.settings->>'anonymityThreshold')::int
       FROM organizations o
       JOIN surveys sv ON sv.organization_id = o.id
       WHERE sv.id = p_survey_id),
      5
    ) AS val
  ),
  segment_responses AS (
    SELECT r.id
    FROM responses r
    JOIN deployments dep ON dep.id = r.deployment_id
    WHERE dep.survey_id = p_survey_id
      AND r.is_complete = true
      AND CASE p_segment_type
            WHEN 'department' THEN r.metadata_department = p_segment_value
            WHEN 'role'       THEN r.metadata_role       = p_segment_value
            WHEN 'location'   THEN r.metadata_location   = p_segment_value
            WHEN 'tenure'     THEN r.metadata_tenure     = p_segment_value
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
    COUNT(a.id) FILTER (WHERE a.likert_value = 1)  AS dist_1,
    COUNT(a.id) FILTER (WHERE a.likert_value = 2)  AS dist_2,
    COUNT(a.id) FILTER (WHERE a.likert_value = 3)  AS dist_3,
    COUNT(a.id) FILTER (WHERE a.likert_value = 4)  AS dist_4,
    COUNT(a.id) FILTER (WHERE a.likert_value = 5)  AS dist_5,
    COUNT(a.id) FILTER (WHERE a.likert_value = 6)  AS dist_6,
    COUNT(a.id) FILTER (WHERE a.likert_value = 7)  AS dist_7,
    COUNT(a.id) FILTER (WHERE a.likert_value = 8)  AS dist_8,
    COUNT(a.id) FILTER (WHERE a.likert_value = 9)  AS dist_9,
    COUNT(a.id) FILTER (WHERE a.likert_value = 10) AS dist_10,
    (SELECT total FROM segment_respondent_count) < (SELECT val FROM threshold) AS is_masked
  FROM questions q
  JOIN question_dimensions qd ON qd.question_id = q.id
  JOIN dimensions d ON d.id = qd.dimension_id
  LEFT JOIN sub_dimensions sd ON sd.id = q.sub_dimension_id
  LEFT JOIN answers a ON a.question_id = q.id
    AND a.response_id IN (SELECT id FROM segment_responses)
  WHERE q.survey_id = p_survey_id
  GROUP BY q.id, q.text, q.order_index, q.reverse_scored,
           q.sub_dimension_id, sd.code, sd.name,
           d.id, d.code, d.name, d.color;
$$;
