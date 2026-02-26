-- Seed Data for Local Development
-- CC+C Organization
INSERT INTO organizations (id, name, slug, settings) VALUES
  ('00000000-0000-0000-0000-000000000001', 'COLLECTIVE culture + communication', 'ccc', '{"timezone": "America/Toronto", "anonymityThreshold": 5}');

-- Test Client Organization
INSERT INTO organizations (id, name, slug, settings) VALUES
  ('00000000-0000-0000-0000-000000000002', 'River Valley Health', 'river-valley-health', '{"timezone": "America/Toronto", "anonymityThreshold": 5, "metadata": {"departments": ["Nursing", "Administration", "Emergency", "Surgery", "Outpatient"], "roles": ["Director", "Manager", "Supervisor", "Staff"], "locations": ["Main Campus", "West Wing", "East Annex"], "tenureBands": ["< 1 year", "1-3 years", "3-5 years", "5-10 years", "10+ years"]}}');

-- System survey template
INSERT INTO survey_templates (id, name, description, is_system) VALUES
  ('00000000-0000-0000-0000-000000000010', 'Culture Compass Assessment', 'The standard CC+C culture assessment survey with 4 dimensions.', true);

-- Sample survey
INSERT INTO surveys (id, organization_id, template_id, title, status) VALUES
  ('00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', 'Q1 2026 Culture Assessment', 'draft');

-- Sample questions
INSERT INTO questions (id, survey_id, text, type, order_index, reverse_scored) VALUES
  ('00000000-0000-0000-0000-000000001001', '00000000-0000-0000-0000-000000000100', 'I understand how my work contributes to the organization''s mission.', 'likert_4', 1, false),
  ('00000000-0000-0000-0000-000000001002', '00000000-0000-0000-0000-000000000100', 'Leadership communicates changes clearly and in a timely manner.', 'likert_4', 2, false),
  ('00000000-0000-0000-0000-000000001003', '00000000-0000-0000-0000-000000000100', 'I feel comfortable sharing honest feedback with my team.', 'likert_4', 3, false),
  ('00000000-0000-0000-0000-000000001004', '00000000-0000-0000-0000-000000000100', 'Teams across the organization collaborate effectively.', 'likert_4', 4, false),
  ('00000000-0000-0000-0000-000000001005', '00000000-0000-0000-0000-000000000100', 'What is one thing you would change about how your organization communicates?', 'open_text', 5, false);

-- Map questions to dimensions
INSERT INTO question_dimensions (question_id, dimension_id, weight) VALUES
  ('00000000-0000-0000-0000-000000001001', (SELECT id FROM dimensions WHERE code = 'core'), 1.0),
  ('00000000-0000-0000-0000-000000001002', (SELECT id FROM dimensions WHERE code = 'clarity'), 1.0),
  ('00000000-0000-0000-0000-000000001003', (SELECT id FROM dimensions WHERE code = 'connection'), 1.0),
  ('00000000-0000-0000-0000-000000001004', (SELECT id FROM dimensions WHERE code = 'collaboration'), 1.0);
