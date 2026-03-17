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

-- Sub-dimensions (21 total, organized by dimension)
-- UUID format: 00000000-0000-0000-0000-00000000XYYY where X=dimension index, YYY=sub-dimension index

-- Core sub-dimensions
INSERT INTO sub_dimensions (id, dimension_id, code, name, description, display_order) VALUES
  ('00000000-0000-0000-0000-000000002001', (SELECT id FROM dimensions WHERE code = 'core'), 'psychological_safety', 'Psychological Safety', 'Can people speak up, take risks, admit mistakes without fear?', 0),
  ('00000000-0000-0000-0000-000000002002', (SELECT id FROM dimensions WHERE code = 'core'), 'trust', 'Trust', 'Do people trust colleagues and leadership to act in good faith?', 1),
  ('00000000-0000-0000-0000-000000002003', (SELECT id FROM dimensions WHERE code = 'core'), 'fairness_integrity', 'Fairness & Integrity', 'Are decisions and treatment fair? Do stated values match reality?', 2),
  ('00000000-0000-0000-0000-000000002004', (SELECT id FROM dimensions WHERE code = 'core'), 'purpose_meaning', 'Purpose & Meaning', 'Is there emotional connection to the work and organization''s mission?', 3),
  ('00000000-0000-0000-0000-000000002005', (SELECT id FROM dimensions WHERE code = 'core'), 'leader_behaviour', 'Leader Behaviour', 'Do leaders'' words and actions align?', 4);

-- Clarity sub-dimensions
INSERT INTO sub_dimensions (id, dimension_id, code, name, description, display_order) VALUES
  ('00000000-0000-0000-0000-000000003001', (SELECT id FROM dimensions WHERE code = 'clarity'), 'decision_making', 'Decision Making', 'Are decision rights clear? Is the process transparent?', 0),
  ('00000000-0000-0000-0000-000000003002', (SELECT id FROM dimensions WHERE code = 'clarity'), 'role_clarity', 'Role Clarity', 'Do people know who owns what?', 1),
  ('00000000-0000-0000-0000-000000003003', (SELECT id FROM dimensions WHERE code = 'clarity'), 'strategic_clarity', 'Strategic Clarity', 'Do people know the mission, priorities, and what matters most?', 2),
  ('00000000-0000-0000-0000-000000003004', (SELECT id FROM dimensions WHERE code = 'clarity'), 'empowerment', 'Empowerment', 'Do people have resources, skills, and autonomy to be effective?', 3),
  ('00000000-0000-0000-0000-000000003005', (SELECT id FROM dimensions WHERE code = 'clarity'), 'goal_alignment', 'Goal Alignment', 'Can people connect their work to organizational outcomes?', 4);

-- Connection sub-dimensions
INSERT INTO sub_dimensions (id, dimension_id, code, name, description, display_order) VALUES
  ('00000000-0000-0000-0000-000000004001', (SELECT id FROM dimensions WHERE code = 'connection'), 'belonging_inclusion', 'Belonging & Inclusion', 'Do people feel truly accepted and part of something?', 0),
  ('00000000-0000-0000-0000-000000004002', (SELECT id FROM dimensions WHERE code = 'connection'), 'employee_voice', 'Employee Voice', 'Can people share concerns, ideas, and dissent?', 1),
  ('00000000-0000-0000-0000-000000004003', (SELECT id FROM dimensions WHERE code = 'connection'), 'information_flow', 'Information Flow', 'Does information flow freely? Is communication clear and two-way?', 2),
  ('00000000-0000-0000-0000-000000004004', (SELECT id FROM dimensions WHERE code = 'connection'), 'shared_identity', 'Shared Identity', 'Is there a sense of ''us'' across teams and levels?', 3),
  ('00000000-0000-0000-0000-000000004005', (SELECT id FROM dimensions WHERE code = 'connection'), 'involvement', 'Involvement', 'Are people included in decisions that affect their work?', 4),
  ('00000000-0000-0000-0000-000000004006', (SELECT id FROM dimensions WHERE code = 'connection'), 'recognition', 'Recognition', 'Do people feel seen and valued?', 5);

-- Collaboration sub-dimensions
INSERT INTO sub_dimensions (id, dimension_id, code, name, description, display_order) VALUES
  ('00000000-0000-0000-0000-000000005001', (SELECT id FROM dimensions WHERE code = 'collaboration'), 'sustainable_pace', 'Sustainable Pace', 'Can people sustain their workload? Boundaries respected?', 0),
  ('00000000-0000-0000-0000-000000005002', (SELECT id FROM dimensions WHERE code = 'collaboration'), 'adaptability_learning', 'Adaptability & Learning', 'Does the org learn from mistakes? Continuous improvement?', 1),
  ('00000000-0000-0000-0000-000000005003', (SELECT id FROM dimensions WHERE code = 'collaboration'), 'cross_functional', 'Cross-Functional Coordination', 'Does work flow smoothly across teams and functions?', 2),
  ('00000000-0000-0000-0000-000000005004', (SELECT id FROM dimensions WHERE code = 'collaboration'), 'ways_of_working', 'Ways of Working', 'Meetings productive? Handoffs smooth?', 3),
  ('00000000-0000-0000-0000-000000005005', (SELECT id FROM dimensions WHERE code = 'collaboration'), 'ownership_accountability', 'Ownership & Accountability', 'Is there clear ownership and follow-through on commitments?', 4);

-- =========================================================================
-- Question Bank v2 — 55 Likert questions + 1 System Health indicator (S4)
-- UUID format: 00000000-0000-0000-0000-1000000000NN where NN = question number
-- =========================================================================

-- CORE — Psychological Safety (Q1-Q2)
INSERT INTO questions (id, survey_id, text, type, order_index, reverse_scored, sub_dimension_id) VALUES
  ('00000000-0000-0000-0000-100000000001', '00000000-0000-0000-0000-000000000100', 'I feel comfortable admitting mistakes or uncertainties.', 'likert', 1, false, '00000000-0000-0000-0000-000000002001'),
  ('00000000-0000-0000-0000-100000000002', '00000000-0000-0000-0000-000000000100', 'It''s safe to bring up problems or tough issues on my team.', 'likert', 2, false, '00000000-0000-0000-0000-000000002001');

-- CORE — Trust (Q3-Q5)
INSERT INTO questions (id, survey_id, text, type, order_index, reverse_scored, sub_dimension_id) VALUES
  ('00000000-0000-0000-0000-100000000003', '00000000-0000-0000-0000-000000000100', 'I assume my colleagues have positive intentions, even during disagreements.', 'likert', 3, false, '00000000-0000-0000-0000-000000002002'),
  ('00000000-0000-0000-0000-100000000004', '00000000-0000-0000-0000-000000000100', 'I trust that my leaders will follow through on their commitments.', 'likert', 4, false, '00000000-0000-0000-0000-000000002002'),
  ('00000000-0000-0000-0000-100000000005', '00000000-0000-0000-0000-000000000100', 'I trust the information I receive from my leaders.', 'likert', 5, false, '00000000-0000-0000-0000-000000002002');

-- CORE — Fairness & Integrity (Q6-Q8)
INSERT INTO questions (id, survey_id, text, type, order_index, reverse_scored, sub_dimension_id) VALUES
  ('00000000-0000-0000-0000-100000000006', '00000000-0000-0000-0000-000000000100', 'Our purpose and values are evident in everyday actions.', 'likert', 6, false, '00000000-0000-0000-0000-000000002003'),
  ('00000000-0000-0000-0000-100000000007', '00000000-0000-0000-0000-000000000100', 'Decisions that affect people in our organization are made fairly and consistently.', 'likert', 7, false, '00000000-0000-0000-0000-000000002003'),
  ('00000000-0000-0000-0000-100000000008', '00000000-0000-0000-0000-000000000100', 'People are held to the same standards, regardless of their position or who they are.', 'likert', 8, false, '00000000-0000-0000-0000-000000002003');

-- CORE — Purpose & Meaning (Q9-Q11)
INSERT INTO questions (id, survey_id, text, type, order_index, reverse_scored, sub_dimension_id) VALUES
  ('00000000-0000-0000-0000-100000000009', '00000000-0000-0000-0000-000000000100', 'I understand why this organization exists and what it stands for.', 'likert', 9, false, '00000000-0000-0000-0000-000000002004'),
  ('00000000-0000-0000-0000-100000000010', '00000000-0000-0000-0000-000000000100', 'The work I do here gives me a sense of personal meaning.', 'likert', 10, false, '00000000-0000-0000-0000-000000002004'),
  ('00000000-0000-0000-0000-100000000011', '00000000-0000-0000-0000-000000000100', 'Working here feels consistent with what I stand for personally.', 'likert', 11, false, '00000000-0000-0000-0000-000000002004');

-- CORE — Leader Behaviour (Q12-Q13)
INSERT INTO questions (id, survey_id, text, type, order_index, reverse_scored, sub_dimension_id) VALUES
  ('00000000-0000-0000-0000-100000000012', '00000000-0000-0000-0000-000000000100', 'Leaders'' actions align with what they say.', 'likert', 12, false, '00000000-0000-0000-0000-000000002005'),
  ('00000000-0000-0000-0000-100000000013', '00000000-0000-0000-0000-000000000100', 'I often receive mixed messages from different leaders.', 'likert', 13, true, '00000000-0000-0000-0000-000000002005');

-- CLARITY — Decision Making (Q14-Q17)
INSERT INTO questions (id, survey_id, text, type, order_index, reverse_scored, sub_dimension_id) VALUES
  ('00000000-0000-0000-0000-100000000014', '00000000-0000-0000-0000-000000000100', 'Priorities often change without clear explanation.', 'likert', 14, true, '00000000-0000-0000-0000-000000003001'),
  ('00000000-0000-0000-0000-100000000015', '00000000-0000-0000-0000-000000000100', 'The reasons behind major decisions are communicated.', 'likert', 15, false, '00000000-0000-0000-0000-000000003001'),
  ('00000000-0000-0000-0000-100000000016', '00000000-0000-0000-0000-000000000100', 'I don''t know what decisions I am allowed to make.', 'likert', 16, true, '00000000-0000-0000-0000-000000003001'),
  ('00000000-0000-0000-0000-100000000017', '00000000-0000-0000-0000-000000000100', 'When expectations change, I understand why.', 'likert', 17, false, '00000000-0000-0000-0000-000000003001');

-- CLARITY — Role Clarity (Q18-Q20)
INSERT INTO questions (id, survey_id, text, type, order_index, reverse_scored, sub_dimension_id) VALUES
  ('00000000-0000-0000-0000-100000000018', '00000000-0000-0000-0000-000000000100', 'I know what''s expected of me in my role.', 'likert', 18, false, '00000000-0000-0000-0000-000000003002'),
  ('00000000-0000-0000-0000-100000000019', '00000000-0000-0000-0000-000000000100', 'It''s clear who is responsible for what on my team.', 'likert', 19, false, '00000000-0000-0000-0000-000000003002'),
  ('00000000-0000-0000-0000-100000000020', '00000000-0000-0000-0000-000000000100', 'I often do work that I''m not sure if I should be doing because responsibilities aren''t clear.', 'likert', 20, true, '00000000-0000-0000-0000-000000003002');

-- CLARITY — Strategic Clarity (Q21-Q22)
INSERT INTO questions (id, survey_id, text, type, order_index, reverse_scored, sub_dimension_id) VALUES
  ('00000000-0000-0000-0000-100000000021', '00000000-0000-0000-0000-000000000100', 'I often feel unsure about where the organization is heading.', 'likert', 21, true, '00000000-0000-0000-0000-000000003003'),
  ('00000000-0000-0000-0000-100000000022', '00000000-0000-0000-0000-000000000100', 'I understand how my team''s work connects to organizational priorities.', 'likert', 22, false, '00000000-0000-0000-0000-000000003003');

-- CLARITY — Empowerment (Q23-Q24)
INSERT INTO questions (id, survey_id, text, type, order_index, reverse_scored, sub_dimension_id) VALUES
  ('00000000-0000-0000-0000-100000000023', '00000000-0000-0000-0000-000000000100', 'Our tools and technology make collaboration simple and efficient.', 'likert', 23, false, '00000000-0000-0000-0000-000000003004'),
  ('00000000-0000-0000-0000-100000000024', '00000000-0000-0000-0000-000000000100', 'I know where to find what I need without asking multiple people.', 'likert', 24, false, '00000000-0000-0000-0000-000000003004');

-- CLARITY — Goal Alignment (Q25-Q27)
INSERT INTO questions (id, survey_id, text, type, order_index, reverse_scored, sub_dimension_id) VALUES
  ('00000000-0000-0000-0000-100000000025', '00000000-0000-0000-0000-000000000100', 'I can see how my work contributes to something meaningful.', 'likert', 25, false, '00000000-0000-0000-0000-000000003005'),
  ('00000000-0000-0000-0000-100000000026', '00000000-0000-0000-0000-000000000100', 'My team''s goals clearly support the organization''s top priorities.', 'likert', 26, false, '00000000-0000-0000-0000-000000003005'),
  ('00000000-0000-0000-0000-100000000027', '00000000-0000-0000-0000-000000000100', 'I sometimes work on things that don''t seem connected to any larger goal.', 'likert', 27, true, '00000000-0000-0000-0000-000000003005');

-- CONNECTION — Belonging & Inclusion (Q28-Q31)
INSERT INTO questions (id, survey_id, text, type, order_index, reverse_scored, sub_dimension_id) VALUES
  ('00000000-0000-0000-0000-100000000028', '00000000-0000-0000-0000-000000000100', 'I feel seen and included, regardless of my role.', 'likert', 28, false, '00000000-0000-0000-0000-000000004001'),
  ('00000000-0000-0000-0000-100000000029', '00000000-0000-0000-0000-000000000100', 'I have fun at work.', 'likert', 29, false, '00000000-0000-0000-0000-000000004001'),
  ('00000000-0000-0000-0000-100000000030', '00000000-0000-0000-0000-000000000100', 'I feel lonely at work.', 'likert', 30, true, '00000000-0000-0000-0000-000000004001'),
  ('00000000-0000-0000-0000-100000000031', '00000000-0000-0000-0000-000000000100', 'I feel a genuine sense of belonging here.', 'likert', 31, false, '00000000-0000-0000-0000-000000004001');

-- CONNECTION — Employee Voice (Q32-Q34)
INSERT INTO questions (id, survey_id, text, type, order_index, reverse_scored, sub_dimension_id) VALUES
  ('00000000-0000-0000-0000-100000000032', '00000000-0000-0000-0000-000000000100', 'I can express a different point of view without negative consequences.', 'likert', 32, false, '00000000-0000-0000-0000-000000004002'),
  ('00000000-0000-0000-0000-100000000033', '00000000-0000-0000-0000-000000000100', 'When I speak up, my input genuinely influences decisions.', 'likert', 33, false, '00000000-0000-0000-0000-000000004002'),
  ('00000000-0000-0000-0000-100000000034', '00000000-0000-0000-0000-000000000100', 'Feedback here often goes into a black hole.', 'likert', 34, true, '00000000-0000-0000-0000-000000004002');

-- CONNECTION — Information Flow (Q35-Q37)
INSERT INTO questions (id, survey_id, text, type, order_index, reverse_scored, sub_dimension_id) VALUES
  ('00000000-0000-0000-0000-100000000035', '00000000-0000-0000-0000-000000000100', 'Communication between all levels of the organization feels open.', 'likert', 35, false, '00000000-0000-0000-0000-000000004003'),
  ('00000000-0000-0000-0000-100000000036', '00000000-0000-0000-0000-000000000100', 'Important information reaches me in time for me to act on it.', 'likert', 36, false, '00000000-0000-0000-0000-000000004003'),
  ('00000000-0000-0000-0000-100000000037', '00000000-0000-0000-0000-000000000100', 'Information flows well between teams, not just within them.', 'likert', 37, false, '00000000-0000-0000-0000-000000004003');

-- CONNECTION — Shared Identity (Q38-Q39)
INSERT INTO questions (id, survey_id, text, type, order_index, reverse_scored, sub_dimension_id) VALUES
  ('00000000-0000-0000-0000-100000000038', '00000000-0000-0000-0000-000000000100', 'Team members look out for each other.', 'likert', 38, false, '00000000-0000-0000-0000-000000004004'),
  ('00000000-0000-0000-0000-100000000039', '00000000-0000-0000-0000-000000000100', 'There is a strong sense of ''we''re all in this together'' across the organization.', 'likert', 39, false, '00000000-0000-0000-0000-000000004004');

-- CONNECTION — Involvement (Q40-Q41)
INSERT INTO questions (id, survey_id, text, type, order_index, reverse_scored, sub_dimension_id) VALUES
  ('00000000-0000-0000-0000-100000000040', '00000000-0000-0000-0000-000000000100', 'I have a say in decisions that affect my day-to-day work.', 'likert', 40, false, '00000000-0000-0000-0000-000000004005'),
  ('00000000-0000-0000-0000-100000000041', '00000000-0000-0000-0000-000000000100', 'People closest to the work are included in decisions about it.', 'likert', 41, false, '00000000-0000-0000-0000-000000004005');

-- CONNECTION — Recognition (Q42-Q43)
INSERT INTO questions (id, survey_id, text, type, order_index, reverse_scored, sub_dimension_id) VALUES
  ('00000000-0000-0000-0000-100000000042', '00000000-0000-0000-0000-000000000100', 'I feel recognized for the contributions that matter most.', 'likert', 42, false, '00000000-0000-0000-0000-000000004006'),
  ('00000000-0000-0000-0000-100000000043', '00000000-0000-0000-0000-000000000100', 'Recognition here often feels like a box-ticking exercise rather than genuine appreciation.', 'likert', 43, true, '00000000-0000-0000-0000-000000004006');

-- COLLABORATION — Sustainable Pace (Q44-Q45)
INSERT INTO questions (id, survey_id, text, type, order_index, reverse_scored, sub_dimension_id) VALUES
  ('00000000-0000-0000-0000-100000000044', '00000000-0000-0000-0000-000000000100', 'We have the right balance between collaboration time and focus time.', 'likert', 44, false, '00000000-0000-0000-0000-000000005001'),
  ('00000000-0000-0000-0000-100000000045', '00000000-0000-0000-0000-000000000100', 'The pace of work here is sustainable over the long term.', 'likert', 45, false, '00000000-0000-0000-0000-000000005001');

-- COLLABORATION — Adaptability & Learning (Q46-Q47)
INSERT INTO questions (id, survey_id, text, type, order_index, reverse_scored, sub_dimension_id) VALUES
  ('00000000-0000-0000-0000-100000000046', '00000000-0000-0000-0000-000000000100', 'When something goes wrong, blame is a common first reaction.', 'likert', 46, true, '00000000-0000-0000-0000-000000005002'),
  ('00000000-0000-0000-0000-100000000047', '00000000-0000-0000-0000-000000000100', 'Our team regularly reflects on what''s working and what isn''t, and adjusts.', 'likert', 47, false, '00000000-0000-0000-0000-000000005002');

-- COLLABORATION — Cross-Functional Coordination (Q48-Q50)
INSERT INTO questions (id, survey_id, text, type, order_index, reverse_scored, sub_dimension_id) VALUES
  ('00000000-0000-0000-0000-100000000048', '00000000-0000-0000-0000-000000000100', 'It''s easy to access the people or information I need to do my job.', 'likert', 48, false, '00000000-0000-0000-0000-000000005003'),
  ('00000000-0000-0000-0000-100000000049', '00000000-0000-0000-0000-000000000100', 'There are silos in our organization.', 'likert', 49, true, '00000000-0000-0000-0000-000000005003'),
  ('00000000-0000-0000-0000-100000000050', '00000000-0000-0000-0000-000000000100', 'I have opportunities to co-create and problem-solve across functions.', 'likert', 50, false, '00000000-0000-0000-0000-000000005003');

-- COLLABORATION — Ways of Working (Q51-Q52)
INSERT INTO questions (id, survey_id, text, type, order_index, reverse_scored, sub_dimension_id) VALUES
  ('00000000-0000-0000-0000-100000000051', '00000000-0000-0000-0000-000000000100', 'We have the right balance between meetings and focus time.', 'likert', 51, false, '00000000-0000-0000-0000-000000005004'),
  ('00000000-0000-0000-0000-100000000052', '00000000-0000-0000-0000-000000000100', 'We have clear processes for how we get work done.', 'likert', 52, false, '00000000-0000-0000-0000-000000005004');

-- COLLABORATION — Ownership & Accountability (Q53-Q55)
INSERT INTO questions (id, survey_id, text, type, order_index, reverse_scored, sub_dimension_id) VALUES
  ('00000000-0000-0000-0000-100000000053', '00000000-0000-0000-0000-000000000100', 'People here follow through on their commitments.', 'likert', 53, false, '00000000-0000-0000-0000-000000005005'),
  ('00000000-0000-0000-0000-100000000054', '00000000-0000-0000-0000-000000000100', 'I understand what is expected of me.', 'likert', 54, false, '00000000-0000-0000-0000-000000005005'),
  ('00000000-0000-0000-0000-100000000055', '00000000-0000-0000-0000-000000000100', 'Things fall through the cracks because nobody clearly owns them.', 'likert', 55, true, '00000000-0000-0000-0000-000000005005');

-- SYSTEM HEALTH — S4 (Q56, no sub-dimension)
INSERT INTO questions (id, survey_id, text, type, order_index, reverse_scored, sub_dimension_id) VALUES
  ('00000000-0000-0000-0000-100000000056', '00000000-0000-0000-0000-000000000100', 'I am proud to be a team member at this organization.', 'likert', 56, false, NULL);

-- Open-ended question (kept from original bank)
INSERT INTO questions (id, survey_id, text, type, order_index, reverse_scored, sub_dimension_id) VALUES
  ('00000000-0000-0000-0000-100000000057', '00000000-0000-0000-0000-000000000100', 'What is one thing you would change about how your organization communicates?', 'open_text', 57, false, NULL);

-- =========================================================================
-- Question-to-dimension mappings
-- Each Likert question maps to exactly one dimension with weight 1.0,
-- except S4 which maps to all 4 dimensions with weight 0.25.
-- =========================================================================

-- Core dimension mappings (Q1-Q13)
INSERT INTO question_dimensions (question_id, dimension_id, weight) VALUES
  ('00000000-0000-0000-0000-100000000001', (SELECT id FROM dimensions WHERE code = 'core'), 1.0),
  ('00000000-0000-0000-0000-100000000002', (SELECT id FROM dimensions WHERE code = 'core'), 1.0),
  ('00000000-0000-0000-0000-100000000003', (SELECT id FROM dimensions WHERE code = 'core'), 1.0),
  ('00000000-0000-0000-0000-100000000004', (SELECT id FROM dimensions WHERE code = 'core'), 1.0),
  ('00000000-0000-0000-0000-100000000005', (SELECT id FROM dimensions WHERE code = 'core'), 1.0),
  ('00000000-0000-0000-0000-100000000006', (SELECT id FROM dimensions WHERE code = 'core'), 1.0),
  ('00000000-0000-0000-0000-100000000007', (SELECT id FROM dimensions WHERE code = 'core'), 1.0),
  ('00000000-0000-0000-0000-100000000008', (SELECT id FROM dimensions WHERE code = 'core'), 1.0),
  ('00000000-0000-0000-0000-100000000009', (SELECT id FROM dimensions WHERE code = 'core'), 1.0),
  ('00000000-0000-0000-0000-100000000010', (SELECT id FROM dimensions WHERE code = 'core'), 1.0),
  ('00000000-0000-0000-0000-100000000011', (SELECT id FROM dimensions WHERE code = 'core'), 1.0),
  ('00000000-0000-0000-0000-100000000012', (SELECT id FROM dimensions WHERE code = 'core'), 1.0),
  ('00000000-0000-0000-0000-100000000013', (SELECT id FROM dimensions WHERE code = 'core'), 1.0);

-- Clarity dimension mappings (Q14-Q27)
INSERT INTO question_dimensions (question_id, dimension_id, weight) VALUES
  ('00000000-0000-0000-0000-100000000014', (SELECT id FROM dimensions WHERE code = 'clarity'), 1.0),
  ('00000000-0000-0000-0000-100000000015', (SELECT id FROM dimensions WHERE code = 'clarity'), 1.0),
  ('00000000-0000-0000-0000-100000000016', (SELECT id FROM dimensions WHERE code = 'clarity'), 1.0),
  ('00000000-0000-0000-0000-100000000017', (SELECT id FROM dimensions WHERE code = 'clarity'), 1.0),
  ('00000000-0000-0000-0000-100000000018', (SELECT id FROM dimensions WHERE code = 'clarity'), 1.0),
  ('00000000-0000-0000-0000-100000000019', (SELECT id FROM dimensions WHERE code = 'clarity'), 1.0),
  ('00000000-0000-0000-0000-100000000020', (SELECT id FROM dimensions WHERE code = 'clarity'), 1.0),
  ('00000000-0000-0000-0000-100000000021', (SELECT id FROM dimensions WHERE code = 'clarity'), 1.0),
  ('00000000-0000-0000-0000-100000000022', (SELECT id FROM dimensions WHERE code = 'clarity'), 1.0),
  ('00000000-0000-0000-0000-100000000023', (SELECT id FROM dimensions WHERE code = 'clarity'), 1.0),
  ('00000000-0000-0000-0000-100000000024', (SELECT id FROM dimensions WHERE code = 'clarity'), 1.0),
  ('00000000-0000-0000-0000-100000000025', (SELECT id FROM dimensions WHERE code = 'clarity'), 1.0),
  ('00000000-0000-0000-0000-100000000026', (SELECT id FROM dimensions WHERE code = 'clarity'), 1.0),
  ('00000000-0000-0000-0000-100000000027', (SELECT id FROM dimensions WHERE code = 'clarity'), 1.0);

-- Connection dimension mappings (Q28-Q43)
INSERT INTO question_dimensions (question_id, dimension_id, weight) VALUES
  ('00000000-0000-0000-0000-100000000028', (SELECT id FROM dimensions WHERE code = 'connection'), 1.0),
  ('00000000-0000-0000-0000-100000000029', (SELECT id FROM dimensions WHERE code = 'connection'), 1.0),
  ('00000000-0000-0000-0000-100000000030', (SELECT id FROM dimensions WHERE code = 'connection'), 1.0),
  ('00000000-0000-0000-0000-100000000031', (SELECT id FROM dimensions WHERE code = 'connection'), 1.0),
  ('00000000-0000-0000-0000-100000000032', (SELECT id FROM dimensions WHERE code = 'connection'), 1.0),
  ('00000000-0000-0000-0000-100000000033', (SELECT id FROM dimensions WHERE code = 'connection'), 1.0),
  ('00000000-0000-0000-0000-100000000034', (SELECT id FROM dimensions WHERE code = 'connection'), 1.0),
  ('00000000-0000-0000-0000-100000000035', (SELECT id FROM dimensions WHERE code = 'connection'), 1.0),
  ('00000000-0000-0000-0000-100000000036', (SELECT id FROM dimensions WHERE code = 'connection'), 1.0),
  ('00000000-0000-0000-0000-100000000037', (SELECT id FROM dimensions WHERE code = 'connection'), 1.0),
  ('00000000-0000-0000-0000-100000000038', (SELECT id FROM dimensions WHERE code = 'connection'), 1.0),
  ('00000000-0000-0000-0000-100000000039', (SELECT id FROM dimensions WHERE code = 'connection'), 1.0),
  ('00000000-0000-0000-0000-100000000040', (SELECT id FROM dimensions WHERE code = 'connection'), 1.0),
  ('00000000-0000-0000-0000-100000000041', (SELECT id FROM dimensions WHERE code = 'connection'), 1.0),
  ('00000000-0000-0000-0000-100000000042', (SELECT id FROM dimensions WHERE code = 'connection'), 1.0),
  ('00000000-0000-0000-0000-100000000043', (SELECT id FROM dimensions WHERE code = 'connection'), 1.0);

-- Collaboration dimension mappings (Q44-Q55)
INSERT INTO question_dimensions (question_id, dimension_id, weight) VALUES
  ('00000000-0000-0000-0000-100000000044', (SELECT id FROM dimensions WHERE code = 'collaboration'), 1.0),
  ('00000000-0000-0000-0000-100000000045', (SELECT id FROM dimensions WHERE code = 'collaboration'), 1.0),
  ('00000000-0000-0000-0000-100000000046', (SELECT id FROM dimensions WHERE code = 'collaboration'), 1.0),
  ('00000000-0000-0000-0000-100000000047', (SELECT id FROM dimensions WHERE code = 'collaboration'), 1.0),
  ('00000000-0000-0000-0000-100000000048', (SELECT id FROM dimensions WHERE code = 'collaboration'), 1.0),
  ('00000000-0000-0000-0000-100000000049', (SELECT id FROM dimensions WHERE code = 'collaboration'), 1.0),
  ('00000000-0000-0000-0000-100000000050', (SELECT id FROM dimensions WHERE code = 'collaboration'), 1.0),
  ('00000000-0000-0000-0000-100000000051', (SELECT id FROM dimensions WHERE code = 'collaboration'), 1.0),
  ('00000000-0000-0000-0000-100000000052', (SELECT id FROM dimensions WHERE code = 'collaboration'), 1.0),
  ('00000000-0000-0000-0000-100000000053', (SELECT id FROM dimensions WHERE code = 'collaboration'), 1.0),
  ('00000000-0000-0000-0000-100000000054', (SELECT id FROM dimensions WHERE code = 'collaboration'), 1.0),
  ('00000000-0000-0000-0000-100000000055', (SELECT id FROM dimensions WHERE code = 'collaboration'), 1.0);

-- System Health S4 — maps to all 4 dimensions with weight 0.25
INSERT INTO question_dimensions (question_id, dimension_id, weight) VALUES
  ('00000000-0000-0000-0000-100000000056', (SELECT id FROM dimensions WHERE code = 'core'), 0.25),
  ('00000000-0000-0000-0000-100000000056', (SELECT id FROM dimensions WHERE code = 'clarity'), 0.25),
  ('00000000-0000-0000-0000-100000000056', (SELECT id FROM dimensions WHERE code = 'connection'), 0.25),
  ('00000000-0000-0000-0000-100000000056', (SELECT id FROM dimensions WHERE code = 'collaboration'), 0.25);
