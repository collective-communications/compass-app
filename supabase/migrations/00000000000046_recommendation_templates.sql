-- Recommendation templates: CC+C-authored suggestions matched to surveys by
-- dimension severity. When score-survey runs, it reads active templates,
-- determines each dimension's severity from scores, and writes matched rows
-- into the per-survey recommendations table.

CREATE TABLE recommendation_templates (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  dimension_code     TEXT        NOT NULL CHECK (dimension_code IN ('core', 'clarity', 'connection', 'collaboration')),
  severity           TEXT        NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'healthy')),
  priority           INT         NOT NULL DEFAULT 0,
  title              TEXT        NOT NULL,
  body               TEXT        NOT NULL,
  actions            JSONB       NOT NULL DEFAULT '[]'::jsonb,
  trust_ladder_link  TEXT,
  ccc_service_link   TEXT,
  is_active          BOOLEAN     NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT recommendation_templates_actions_is_array CHECK (jsonb_typeof(actions) = 'array')
);

CREATE TRIGGER recommendation_templates_updated_at
  BEFORE UPDATE ON recommendation_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE recommendation_templates ENABLE ROW LEVEL SECURITY;

-- CC+C admins can fully manage templates
CREATE POLICY "ccc_admin can manage recommendation templates"
  ON recommendation_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'ccc_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'ccc_admin')
  );

-- Score-survey edge function (service role) bypasses RLS — no policy needed.
-- All authenticated users can read active templates for display purposes.
CREATE POLICY "authenticated users can read active templates"
  ON recommendation_templates FOR SELECT
  TO authenticated
  USING (is_active = true);

-- ── Default template library ────────────────────────────────────────────────

-- Core · CRITICAL (score < 50)
INSERT INTO recommendation_templates (dimension_code, severity, priority, title, body, actions, trust_ladder_link, ccc_service_link) VALUES
(
  'core', 'critical', 1,
  'Rebuild foundational trust',
  'Core scores are critically low — the foundation that underpins all other dimensions is broken. People do not feel psychologically safe, and the gap between stated values and lived experience is eroding trust faster than it can be rebuilt. This requires immediate, visible leadership action.',
  '["Launch anonymous listening sessions with confidential reporting", "Commit to a public \"you said, we did\" accountability cycle", "Enrol front-line managers in psychological safety training", "Create a dedicated channel for concerns that cannot be raised upward"]'::jsonb,
  'Purpose (Rung 1)',
  'Executive Coaching'
),
(
  'core', 'critical', 2,
  'Address leadership behaviour gaps',
  'Low Core scores often trace to a specific set of leadership behaviours — fear of speaking up, lack of follow-through on commitments, or values that are proclaimed but not modelled. Closing the gap requires candid assessment and structured accountability.',
  '["Run a 360-degree leadership feedback process", "Tie core culture metrics to leadership performance reviews", "Hold skip-level open-door sessions quarterly", "Establish a peer-accountability covenant at the SLT level"]'::jsonb,
  'Belonging (Rung 3)',
  'Leadership Development'
);

-- Core · MEDIUM (score 50–70)
INSERT INTO recommendation_templates (dimension_code, severity, priority, title, body, actions, trust_ladder_link, ccc_service_link) VALUES
(
  'core', 'medium', 1,
  'Strengthen psychological safety',
  'Core scores sit in the fragile range — enough for day-to-day function but not enough to support candid feedback, innovation, or difficult conversations. People are holding back. Targeted investment now prevents a drift into the critical zone.',
  '["Introduce team-level psychological safety check-ins (monthly)", "Train managers on active listening and non-punitive response to bad news", "Create low-barrier anonymous feedback mechanisms", "Pilot a \"failure autopsy\" practice to normalise learning from mistakes"]'::jsonb,
  'Belonging (Rung 3)',
  'Team Workshop'
),
(
  'core', 'medium', 2,
  'Close the values-to-behaviour gap',
  'Fragile Core often reflects a mismatch between written values and observable daily behaviour. The fix is not new values — it is making current values operational: specific, observable, and tied to recognition and accountability.',
  '["Audit stated values against observed leadership behaviours", "Add a values-alignment dimension to regular performance conversations", "Celebrate values-in-action stories in all-hands and team meetings", "Remove or revise values that no longer reflect organisational reality"]'::jsonb,
  NULL,
  'Culture Diagnostic'
);

-- Core · HEALTHY (score ≥ 70)
INSERT INTO recommendation_templates (dimension_code, severity, priority, title, body, actions, trust_ladder_link, ccc_service_link) VALUES
(
  'core', 'healthy', 1,
  'Sustain purpose and trust culture',
  'Core scores are strong — psychological safety, purpose, and trust are working. The risk at this stage is complacency: cultures erode quietly when maintenance stops. Protect the foundation as the organisation grows and evolves.',
  '["Extend onboarding to lateral transfers and role changes, not just new hires", "Add a purpose-alignment check-in to the 90-day review process", "Run an annual \"culture health\" pulse to catch early drift", "Document and share the practices that built this foundation"]'::jsonb,
  'Purpose (Rung 1)',
  NULL
);

-- Clarity · HIGH (score < 40)
INSERT INTO recommendation_templates (dimension_code, severity, priority, title, body, actions, trust_ladder_link, ccc_service_link) VALUES
(
  'clarity', 'high', 1,
  'Establish clear communication channels',
  'Clarity scores are critically low — people lack role clarity, strategic direction, and reliable information flow. Without a clear signal, effort fragments and misalignment compounds. The immediate priority is reducing noise and establishing authoritative sources.',
  '["Audit and consolidate communication channels — eliminate redundant ones", "Define a single source of truth for announcements, decisions, and strategy", "Run a role-clarity session: each person states what they own and what they do not", "Publish decision-making principles so people know who decides what"]'::jsonb,
  'Processes & Platforms (Rung 8)',
  'Communication Audit'
),
(
  'clarity', 'high', 2,
  'Rebuild strategic line of sight',
  'When Clarity is critically low, people cannot connect their daily work to organisational goals. Rebuilding line of sight — from strategy to team to individual — is the fastest way to restore motivation and reduce duplicated effort.',
  '["Cascade OKRs from SLT to team level with explicit linkage", "Run a quarterly \"direction alignment\" session at team level", "Make strategy documents accessible and written in plain language", "Brief managers on the \"why\" before they communicate the \"what\""]'::jsonb,
  'Vision (Rung 2)',
  'Strategy Activation'
);

-- Clarity · HEALTHY (score ≥ 40)
INSERT INTO recommendation_templates (dimension_code, severity, priority, title, body, actions, trust_ladder_link, ccc_service_link) VALUES
(
  'clarity', 'healthy', 1,
  'Maintain strategic clarity and reduce channel noise',
  'Clarity scores are healthy — people understand their roles and the direction. The most common risk is channel proliferation over time. A lightweight maintenance routine protects the clarity you have built.',
  '["Run a bi-annual channel audit — archive inactive channels", "Establish a \"no-meeting Wednesday\" to protect deep-work focus", "Keep OKRs visible and reviewed at the team level quarterly", "Add channel-purpose descriptions to all shared spaces"]'::jsonb,
  NULL,
  NULL
);

-- Connection · HIGH (score < 40)
INSERT INTO recommendation_templates (dimension_code, severity, priority, title, body, actions, trust_ladder_link, ccc_service_link) VALUES
(
  'connection', 'high', 1,
  'Rebuild employee voice and belonging',
  'Connection scores are critically low — people do not feel heard, seen, or like they belong. Feedback channels are perceived as performative or unsafe. Without connection, the organisation cannot detect emerging risks or retain talent through difficult periods.',
  '["Launch anonymous skip-level listening sessions with visible follow-through", "Implement structured upward feedback with \"you said, we did\" reporting", "Create peer-facilitated discussion circles across teams", "Establish a belonging and inclusion working group with real authority"]'::jsonb,
  'Relationship (Rung 6)',
  'Listening Labs'
),
(
  'connection', 'high', 2,
  'Create meaningful interaction rituals',
  'Low Connection often reflects structural barriers to relationship-building — remote work, siloed teams, or back-to-back schedules that leave no room for informal connection. Solving this requires deliberate structural change, not just social events.',
  '["Redesign weekly rhythms to include protected informal-connection time", "Pair cross-functional peers for monthly 30-minute connection calls", "Introduce a lightweight peer-recognition practice in team rituals", "Replace status-update meetings with discussion-first formats"]'::jsonb,
  'Recognition (Rung 7)',
  'Team Workshop'
);

-- Connection · HEALTHY (score ≥ 40)
INSERT INTO recommendation_templates (dimension_code, severity, priority, title, body, actions, trust_ladder_link, ccc_service_link) VALUES
(
  'connection', 'healthy', 1,
  'Deepen cross-functional relationships',
  'Connection scores are solid — people feel heard and valued. To sustain this as the organisation scales, extend connection practices beyond existing teams and into cross-functional relationships, which are typically the first to weaken under growth pressure.',
  '["Launch cross-functional lunch-and-learns quarterly", "Expand peer-recognition programs to include cross-team nominations", "Document connection rituals in onboarding so new hires inherit them", "Pilot a cross-team rotation or shadowing programme"]'::jsonb,
  'Relationship (Rung 6)',
  NULL
);

-- Collaboration · HIGH (score < 40)
INSERT INTO recommendation_templates (dimension_code, severity, priority, title, body, actions, trust_ladder_link, ccc_service_link) VALUES
(
  'collaboration', 'high', 1,
  'Break down organisational silos',
  'Collaboration scores are critically low — cross-functional work is described as nearly impossible. Information and people are trapped within vertical hierarchies. The cost is duplicated effort, slow decisions, and inability to execute on any initiative that crosses team boundaries.',
  '["Create cross-functional task forces for every major initiative", "Rotate attendance at leadership meetings across departments", "Establish shared OKRs that explicitly require cross-team delivery", "Make information-sharing a leadership accountability metric"]'::jsonb,
  'Processes & Platforms (Rung 8)',
  'Team Workshop'
),
(
  'collaboration', 'high', 2,
  'Establish shared ways of working',
  'Low Collaboration often reflects the absence of agreed working norms — teams have developed incompatible habits that make joint work frustrating. Establishing shared principles reduces friction before it compounds into conflict.',
  '["Co-create a cross-team working agreement (how we meet, decide, communicate)", "Run retrospectives across team boundaries, not only within them", "Identify two or three shared tools and deprecate incompatible ones", "Assign a collaboration champion in each team to maintain the norms"]'::jsonb,
  NULL,
  'Culture Diagnostic'
);

-- Collaboration · HEALTHY (score ≥ 40)
INSERT INTO recommendation_templates (dimension_code, severity, priority, title, body, actions, trust_ladder_link, ccc_service_link) VALUES
(
  'collaboration', 'healthy', 1,
  'Scale collaboration practices as the organisation grows',
  'Collaboration scores are strong — teams work well together and share ownership. The challenge at scale is that informal collaboration practices stop working as headcount grows. Documenting and systematising them now protects the culture you have built.',
  '["Document current collaboration rituals and include them in onboarding", "Expand peer-recognition programs to reward collaborative behaviours explicitly", "Run a semi-annual review of shared tools and working norms", "Create a community of practice for cross-team knowledge sharing"]'::jsonb,
  NULL,
  NULL
);
