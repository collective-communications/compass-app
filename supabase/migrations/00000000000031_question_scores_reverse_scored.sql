-- Add reverse_scored column to question_scores view.
-- The frontend displays a "Reverse" badge on reverse-scored questions
-- but the view was missing this field, causing PostgREST 400 errors.

DROP VIEW IF EXISTS question_scores;
CREATE VIEW question_scores AS
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
FROM questions q
JOIN question_dimensions qd ON qd.question_id = q.id
JOIN dimensions d ON d.id = qd.dimension_id
LEFT JOIN sub_dimensions sd ON sd.id = q.sub_dimension_id
LEFT JOIN answers a ON a.question_id = q.id
  AND a.response_id IN (
    SELECT r.id FROM responses r WHERE r.is_complete = true
  )
GROUP BY q.survey_id, q.id, q.text, q.order_index, q.type, q.reverse_scored,
         q.sub_dimension_id, sd.code, sd.name,
         d.id, d.code, d.name, d.color;
