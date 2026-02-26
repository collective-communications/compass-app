-- RLS Policies (S7)

-- Helper functions
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS user_role AS $$
  SELECT role FROM org_members
  WHERE user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION auth_user_org_id()
RETURNS UUID AS $$
  SELECT organization_id FROM org_members
  WHERE user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_ccc_user()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members
    WHERE user_id = auth.uid()
    AND role IN ('ccc_admin', 'ccc_member')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE dimensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_dimensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE archetypes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE dialogue_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_recalculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- ORGANIZATIONS
CREATE POLICY "ccc_admin_all_orgs" ON organizations FOR ALL USING (is_ccc_user());
CREATE POLICY "client_read_own_org" ON organizations FOR SELECT USING (id = auth_user_org_id());

-- ORG_MEMBERS
CREATE POLICY "ccc_admin_all_members" ON org_members FOR ALL USING (is_ccc_user());
CREATE POLICY "client_read_own_members" ON org_members FOR SELECT USING (organization_id = auth_user_org_id());

-- DIMENSIONS (readable by everyone including anon for survey display)
CREATE POLICY "anyone_read_dimensions" ON dimensions FOR SELECT USING (true);

-- SURVEY_TEMPLATES
CREATE POLICY "ccc_admin_all_templates" ON survey_templates FOR ALL USING (is_ccc_user());
CREATE POLICY "authenticated_read_templates" ON survey_templates FOR SELECT USING (auth.role() = 'authenticated');

-- SURVEYS
CREATE POLICY "ccc_admin_all_surveys" ON surveys FOR ALL USING (is_ccc_user());
CREATE POLICY "client_read_own_surveys" ON surveys FOR SELECT USING (organization_id = auth_user_org_id());

-- QUESTIONS
CREATE POLICY "ccc_admin_all_questions" ON questions FOR ALL USING (is_ccc_user());
CREATE POLICY "client_read_own_questions" ON questions FOR SELECT USING (
  survey_id IN (SELECT id FROM surveys WHERE organization_id = auth_user_org_id())
);

-- QUESTION_DIMENSIONS
CREATE POLICY "ccc_admin_all_qd" ON question_dimensions FOR ALL USING (is_ccc_user());
CREATE POLICY "client_read_own_qd" ON question_dimensions FOR SELECT USING (
  question_id IN (
    SELECT q.id FROM questions q
    JOIN surveys s ON s.id = q.survey_id
    WHERE s.organization_id = auth_user_org_id()
  )
);

-- DEPLOYMENTS
CREATE POLICY "ccc_admin_all_deployments" ON deployments FOR ALL USING (is_ccc_user());
CREATE POLICY "client_read_own_deployments" ON deployments FOR SELECT USING (
  survey_id IN (SELECT id FROM surveys WHERE organization_id = auth_user_org_id())
);

-- RESPONSES (service role for writes, ccc for reads)
CREATE POLICY "ccc_read_responses" ON responses FOR SELECT USING (is_ccc_user());
CREATE POLICY "service_all_responses" ON responses FOR ALL USING (auth.role() = 'service_role');

-- ANSWERS
CREATE POLICY "ccc_read_answers" ON answers FOR SELECT USING (is_ccc_user());
CREATE POLICY "service_all_answers" ON answers FOR ALL USING (auth.role() = 'service_role');

-- SCORES
CREATE POLICY "ccc_admin_all_scores" ON scores FOR ALL USING (is_ccc_user());
CREATE POLICY "client_read_own_scores" ON scores FOR SELECT USING (
  survey_id IN (SELECT id FROM surveys WHERE organization_id = auth_user_org_id())
);
CREATE POLICY "service_all_scores" ON scores FOR ALL USING (auth.role() = 'service_role');

-- ARCHETYPES
CREATE POLICY "authenticated_read_archetypes" ON archetypes FOR SELECT USING (auth.role() = 'authenticated');

-- RECOMMENDATIONS
CREATE POLICY "ccc_admin_all_recs" ON recommendations FOR ALL USING (is_ccc_user());
CREATE POLICY "client_read_own_recs" ON recommendations FOR SELECT USING (
  survey_id IN (SELECT id FROM surveys WHERE organization_id = auth_user_org_id())
);
CREATE POLICY "service_all_recs" ON recommendations FOR ALL USING (auth.role() = 'service_role');

-- DIALOGUE_KEYWORDS
CREATE POLICY "ccc_admin_all_keywords" ON dialogue_keywords FOR ALL USING (is_ccc_user());
CREATE POLICY "client_read_own_keywords" ON dialogue_keywords FOR SELECT USING (
  survey_id IN (SELECT id FROM surveys WHERE organization_id = auth_user_org_id())
);
CREATE POLICY "service_all_keywords" ON dialogue_keywords FOR ALL USING (auth.role() = 'service_role');

-- SCORE_RECALCULATIONS
CREATE POLICY "ccc_admin_all_recalcs" ON score_recalculations FOR ALL USING (is_ccc_user());
CREATE POLICY "service_all_recalcs" ON score_recalculations FOR ALL USING (auth.role() = 'service_role');

-- REPORTS
CREATE POLICY "ccc_admin_all_reports" ON reports FOR ALL USING (is_ccc_user());
CREATE POLICY "client_read_visible_reports" ON reports FOR SELECT USING (
  client_visible = true AND organization_id = auth_user_org_id()
);
CREATE POLICY "service_all_reports" ON reports FOR ALL USING (auth.role() = 'service_role');
