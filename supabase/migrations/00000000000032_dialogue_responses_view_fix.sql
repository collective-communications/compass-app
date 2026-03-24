-- Fix dialogue_responses view to include row id and created_at alias.
-- The frontend hook selects 'id' and 'created_at' which didn't exist on the view.
-- Must DROP + CREATE because CREATE OR REPLACE cannot reorder/add columns.
DROP VIEW IF EXISTS dialogue_responses;

CREATE VIEW dialogue_responses AS
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
FROM answers a
JOIN responses r ON r.id = a.response_id
JOIN questions q ON q.id = a.question_id
JOIN deployments dep ON dep.id = r.deployment_id
JOIN surveys s ON s.id = dep.survey_id
WHERE a.open_text_value IS NOT NULL
  AND r.is_complete = true;
