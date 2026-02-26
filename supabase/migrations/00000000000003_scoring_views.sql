-- Scoring Tables & Views (S6)

CREATE TABLE scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  dimension_id UUID NOT NULL REFERENCES dimensions(id),
  segment_type TEXT,
  segment_value TEXT,
  score NUMERIC(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
  raw_score NUMERIC(3,2) NOT NULL CHECK (raw_score >= 1 AND raw_score <= 4),
  response_count INT NOT NULL DEFAULT 0,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(survey_id, dimension_id, segment_type, segment_value)
);

CREATE TABLE archetypes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  target_vectors JSONB NOT NULL,
  display_order INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO archetypes (code, name, description, target_vectors, display_order) VALUES
  ('aligned', 'Aligned & Thriving', 'High scores across all dimensions. The organization demonstrates strong cultural alignment with clear communication, genuine connection, and effective collaboration.', '{"core": 85, "clarity": 80, "connection": 80, "collaboration": 80}', 1),
  ('over_collaborated', 'Over-Collaborated', 'Strong connection and collaboration but lower clarity. Teams work well together but may lack clear direction, leading to consensus-seeking over decisive action.', '{"core": 60, "clarity": 40, "connection": 80, "collaboration": 85}', 2),
  ('well_intentioned', 'Well-Intentioned but Disconnected', 'Moderate scores with a gap between intent and impact. Leadership means well but communication gaps create misalignment between stated values and lived experience.', '{"core": 55, "clarity": 55, "connection": 45, "collaboration": 50}', 3),
  ('command_and_control', 'Command & Control', 'High clarity but low connection and collaboration. Communication flows top-down with clear directives but limited feedback loops or peer collaboration.', '{"core": 50, "clarity": 75, "connection": 30, "collaboration": 35}', 4),
  ('busy_but_burned', 'Busy but Burned Out', 'Low scores across dimensions, especially connection. High activity masks cultural dysfunction — people are working hard but not working well together.', '{"core": 30, "clarity": 35, "connection": 25, "collaboration": 40}', 5);

CREATE TABLE recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  dimension_id UUID REFERENCES dimensions(id),
  priority INT NOT NULL DEFAULT 0,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'healthy')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  trust_ladder_link TEXT,
  ccc_service_link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER recommendations_updated_at
  BEFORE UPDATE ON recommendations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE dialogue_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  dimension_id UUID REFERENCES dimensions(id),
  keyword TEXT NOT NULL,
  frequency INT NOT NULL DEFAULT 1,
  sentiment TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE score_recalculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  triggered_by TEXT NOT NULL,
  reason TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed'))
);

CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'generating' CHECK (status IN ('generating', 'ready', 'failed')),
  storage_path TEXT,
  client_visible BOOLEAN NOT NULL DEFAULT false,
  triggered_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- safe_segment_scores: enforces anonymity threshold
CREATE OR REPLACE VIEW safe_segment_scores AS
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
       FROM organizations o
       JOIN surveys sv ON sv.organization_id = o.id
       WHERE sv.id = s.survey_id),
      5
    )
    THEN s.score
    ELSE NULL
  END AS score,
  CASE
    WHEN s.response_count >= COALESCE(
      (SELECT (o.settings->>'anonymityThreshold')::int
       FROM organizations o
       JOIN surveys sv ON sv.organization_id = o.id
       WHERE sv.id = s.survey_id),
      5
    )
    THEN s.raw_score
    ELSE NULL
  END AS raw_score,
  CASE
    WHEN s.response_count >= COALESCE(
      (SELECT (o.settings->>'anonymityThreshold')::int
       FROM organizations o
       JOIN surveys sv ON sv.organization_id = o.id
       WHERE sv.id = s.survey_id),
      5
    )
    THEN s.response_count
    ELSE NULL
  END AS response_count,
  s.response_count < COALESCE(
    (SELECT (o.settings->>'anonymityThreshold')::int
     FROM organizations o
     JOIN surveys sv ON sv.organization_id = o.id
     WHERE sv.id = s.survey_id),
    5
  ) AS is_masked
FROM scores s
JOIN dimensions d ON d.id = s.dimension_id;

-- active_survey_per_org: convenience view for client dashboard
CREATE OR REPLACE VIEW active_survey_per_org AS
SELECT DISTINCT ON (s.organization_id)
  s.id AS survey_id,
  s.organization_id,
  s.title,
  s.status,
  s.opens_at,
  s.closes_at,
  s.scores_calculated,
  (SELECT count(*) FROM responses r
   JOIN deployments dep ON dep.id = r.deployment_id
   WHERE dep.survey_id = s.id AND r.is_complete = true
  ) AS total_responses,
  (SELECT count(*) FROM deployments dep
   WHERE dep.survey_id = s.id AND dep.is_active = true
  ) AS active_deployments
FROM surveys s
WHERE s.status IN ('active', 'closed')
ORDER BY s.organization_id, s.closes_at DESC NULLS LAST;
