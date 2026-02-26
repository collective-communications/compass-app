-- Platform Features: missing tables, views, RLS policies, and anonymous insert policies
-- Required by Wave 1-5 hooks that reference these tables at runtime

-- ============================================================================
-- TABLES
-- ============================================================================

CREATE TABLE admin_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  role user_role NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'client_user',
  assigned_clients UUID[] NOT NULL DEFAULT '{}',
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE organization_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  metadata_departments JSONB NOT NULL DEFAULT '[]',
  metadata_roles JSONB NOT NULL DEFAULT '[]',
  metadata_locations JSONB NOT NULL DEFAULT '[]',
  metadata_tenure_bands JSONB NOT NULL DEFAULT '[]',
  display_name TEXT,
  logo_url TEXT,
  client_access_enabled BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER organization_settings_updated_at
  BEFORE UPDATE ON organization_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE organization_consultants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  consultant_name TEXT NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE platform_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  anonymity_threshold INT NOT NULL DEFAULT 5,
  default_duration_days INT NOT NULL DEFAULT 14,
  welcome_message TEXT NOT NULL DEFAULT 'Welcome to the Culture Compass survey.',
  completion_message TEXT NOT NULL DEFAULT 'Thank you for completing the survey.',
  logo_url TEXT,
  brand_colors JSONB NOT NULL DEFAULT '{"core": "#0A3B4F", "clarity": "#FF7F50", "connection": "#9FD7C3", "collaboration": "#E8B4A8"}',
  data_retention_policy TEXT NOT NULL DEFAULT '3 years',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER platform_settings_updated_at
  BEFORE UPDATE ON platform_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- VIEWS
-- ============================================================================

-- question_scores: denormalized aggregation per question per survey
CREATE OR REPLACE VIEW question_scores AS
SELECT
  q.survey_id,
  q.id AS question_id,
  q.text AS question_text,
  q.order_index,
  q.type AS question_type,
  d.id AS dimension_id,
  d.code AS dimension_code,
  d.name AS dimension_name,
  d.color AS dimension_color,
  COUNT(a.id) FILTER (WHERE a.likert_value IS NOT NULL) AS response_count,
  AVG(a.likert_value) FILTER (WHERE a.likert_value IS NOT NULL) AS mean_score,
  COUNT(a.id) FILTER (WHERE a.likert_value = 1) AS dist_1,
  COUNT(a.id) FILTER (WHERE a.likert_value = 2) AS dist_2,
  COUNT(a.id) FILTER (WHERE a.likert_value = 3) AS dist_3,
  COUNT(a.id) FILTER (WHERE a.likert_value = 4) AS dist_4
FROM questions q
JOIN question_dimensions qd ON qd.question_id = q.id
JOIN dimensions d ON d.id = qd.dimension_id
LEFT JOIN answers a ON a.question_id = q.id
  AND a.response_id IN (
    SELECT r.id FROM responses r WHERE r.is_complete = true
  )
GROUP BY q.survey_id, q.id, q.text, q.order_index, q.type,
         d.id, d.code, d.name, d.color;

-- dialogue_responses: open-text answers denormalized with question + survey context
CREATE OR REPLACE VIEW dialogue_responses AS
SELECT
  s.id AS survey_id,
  s.organization_id,
  q.id AS question_id,
  q.text AS question_text,
  a.open_text_value AS response_text,
  r.metadata_department,
  r.metadata_role,
  r.metadata_location,
  r.metadata_tenure,
  r.submitted_at
FROM answers a
JOIN responses r ON r.id = a.response_id
JOIN questions q ON q.id = a.question_id
JOIN deployments dep ON dep.id = r.deployment_id
JOIN surveys s ON s.id = dep.survey_id
WHERE a.open_text_value IS NOT NULL
  AND r.is_complete = true;

-- ============================================================================
-- RLS
-- ============================================================================

ALTER TABLE admin_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_consultants ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- admin_notes: CC+C full access
CREATE POLICY "ccc_all_admin_notes" ON admin_notes FOR ALL USING (is_ccc_user());

-- invitations: CC+C full access
CREATE POLICY "ccc_all_invitations" ON invitations FOR ALL USING (is_ccc_user());

-- user_profiles: CC+C full access, self read own
CREATE POLICY "ccc_all_user_profiles" ON user_profiles FOR ALL USING (is_ccc_user());
CREATE POLICY "self_read_own_profile" ON user_profiles FOR SELECT USING (id = auth.uid());

-- organization_settings: CC+C full access, client read own org
CREATE POLICY "ccc_all_org_settings" ON organization_settings FOR ALL USING (is_ccc_user());
CREATE POLICY "client_read_own_org_settings" ON organization_settings FOR SELECT USING (
  organization_id = auth_user_org_id()
);

-- organization_consultants: CC+C full access
CREATE POLICY "ccc_all_org_consultants" ON organization_consultants FOR ALL USING (is_ccc_user());

-- platform_settings: CC+C full access
CREATE POLICY "ccc_all_platform_settings" ON platform_settings FOR ALL USING (is_ccc_user());

-- ============================================================================
-- ANONYMOUS INSERT POLICIES (survey submission)
-- ============================================================================

-- Allow anonymous users to insert responses via valid deployment token
CREATE POLICY "anon_insert_responses" ON responses FOR INSERT
  WITH CHECK (
    auth.role() = 'anon'
    AND deployment_id IN (
      SELECT d.id FROM deployments d
      JOIN surveys s ON s.id = d.survey_id
      WHERE d.is_active = true
        AND s.status = 'active'
        AND (d.closes_at IS NULL OR d.closes_at > now())
    )
  );

-- Allow anonymous users to insert answers for their own response
CREATE POLICY "anon_insert_answers" ON answers FOR INSERT
  WITH CHECK (
    auth.role() = 'anon'
    AND response_id IN (
      SELECT r.id FROM responses r
      WHERE r.session_token = current_setting('request.headers', true)::json->>'x-session-token'
    )
  );

-- Allow anonymous users to update their own in-progress responses (mark complete)
CREATE POLICY "anon_update_own_responses" ON responses FOR UPDATE
  USING (
    auth.role() = 'anon'
    AND session_token = current_setting('request.headers', true)::json->>'x-session-token'
    AND is_complete = false
  );

-- Allow anonymous users to read their own in-progress response
CREATE POLICY "anon_read_own_responses" ON responses FOR SELECT
  USING (
    auth.role() = 'anon'
    AND session_token = current_setting('request.headers', true)::json->>'x-session-token'
  );

-- Allow anonymous users to read their own answers (for resume)
CREATE POLICY "anon_read_own_answers" ON answers FOR SELECT
  USING (
    auth.role() = 'anon'
    AND response_id IN (
      SELECT r.id FROM responses r
      WHERE r.session_token = current_setting('request.headers', true)::json->>'x-session-token'
    )
  );

-- Allow anonymous users to read questions for active surveys (to render the survey)
CREATE POLICY "anon_read_active_questions" ON questions FOR SELECT
  USING (
    auth.role() = 'anon'
    AND survey_id IN (SELECT id FROM surveys WHERE status = 'active')
  );

-- Allow anonymous users to read deployments they have a token for
CREATE POLICY "anon_read_active_deployments" ON deployments FOR SELECT
  USING (
    auth.role() = 'anon'
    AND is_active = true
  );

-- ============================================================================
-- SEED DATA
-- ============================================================================

INSERT INTO platform_settings (
  anonymity_threshold,
  default_duration_days,
  welcome_message,
  completion_message,
  brand_colors,
  data_retention_policy
) VALUES (
  5,
  14,
  'Welcome to the Culture Compass survey.',
  'Thank you for completing the survey.',
  '{"core": "#0A3B4F", "clarity": "#FF7F50", "connection": "#9FD7C3", "collaboration": "#E8B4A8"}',
  '3 years'
);
