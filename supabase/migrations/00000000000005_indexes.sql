-- Performance Indexes (S7)

CREATE INDEX idx_responses_deployment_submitted ON responses(deployment_id, submitted_at);
CREATE INDEX idx_responses_deployment_session ON responses(deployment_id, session_token);
CREATE INDEX idx_deployments_token ON deployments(token);
CREATE INDEX idx_scores_survey_dimension_segment ON scores(survey_id, dimension_id, segment_type, segment_value);
CREATE INDEX idx_answers_response_question ON answers(response_id, question_id);
CREATE INDEX idx_surveys_org_status ON surveys(organization_id, status);
CREATE INDEX idx_reports_org_visible_created ON reports(organization_id, client_visible, created_at DESC);
CREATE INDEX idx_questions_survey_order ON questions(survey_id, order_index);
CREATE INDEX idx_org_members_user ON org_members(user_id);
CREATE INDEX idx_org_members_org ON org_members(organization_id);
