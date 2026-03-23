/**
 * Scenario seed script — creates 5 organizations, each shaped to match
 * one of the Culture Compass archetypes.
 *
 * Each scenario seeds: org → survey → questions → deployment → shaped
 * responses → pre-computed scores → recommendations → dialogue keywords.
 *
 * The base seed (seed-dev.ts) must have been run at least once first
 * so that dimensions and sub-dimensions exist.
 *
 * Usage:
 *   bun run scripts/seed-scenarios.ts          # seed
 *   bun run scripts/seed-scenarios.ts --clean  # tear down scenario data
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

function loadEnv(): Record<string, string> {
  const envPath = resolve(import.meta.dirname, '..', '.env.local');
  const content = readFileSync(envPath, 'utf-8');
  const vars: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    vars[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
  }
  return vars;
}

const env = loadEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL ?? env.SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local',
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SCALE_SIZE = 5;
const RESPONSE_COUNT = 35;

// Sub-dimension IDs (must match seed-dev.ts / the DB)
const SUB = {
  psychological_safety: '00000000-0000-0000-0000-000000002001',
  trust: '00000000-0000-0000-0000-000000002002',
  fairness_integrity: '00000000-0000-0000-0000-000000002003',
  purpose_meaning: '00000000-0000-0000-0000-000000002004',
  leader_behaviour: '00000000-0000-0000-0000-000000002005',
  decision_making: '00000000-0000-0000-0000-000000003001',
  role_clarity: '00000000-0000-0000-0000-000000003002',
  strategic_clarity: '00000000-0000-0000-0000-000000003003',
  empowerment: '00000000-0000-0000-0000-000000003004',
  goal_alignment: '00000000-0000-0000-0000-000000003005',
  belonging_inclusion: '00000000-0000-0000-0000-000000004001',
  employee_voice: '00000000-0000-0000-0000-000000004002',
  information_flow: '00000000-0000-0000-0000-000000004003',
  shared_identity: '00000000-0000-0000-0000-000000004004',
  involvement: '00000000-0000-0000-0000-000000004005',
  recognition: '00000000-0000-0000-0000-000000004006',
  sustainable_pace: '00000000-0000-0000-0000-000000005001',
  adaptability_learning: '00000000-0000-0000-0000-000000005002',
  cross_functional: '00000000-0000-0000-0000-000000005003',
  ways_of_working: '00000000-0000-0000-0000-000000005004',
  ownership_accountability: '00000000-0000-0000-0000-000000005005',
} as const;

// Metadata options shared across all scenarios
const DEPARTMENTS = ['Operations', 'Clinical', 'Finance', 'Technology', 'People & Culture'];
const ROLES = ['Director', 'Manager', 'Supervisor', 'Staff'];
const LOCATIONS = ['Main Campus', 'West Wing', 'East Annex'];
const TENURES = ['< 1 year', '1-3 years', '3-5 years', '5-10 years', '10+ years'];

// Distribution of responses per department (35 total).
// Last department gets 3 responses — below anonymity threshold of 5.
const DEPT_DISTRIBUTION = [10, 8, 7, 7, 3];

// ---------------------------------------------------------------------------
// Question definitions (identical to seed-dev.ts)
// ---------------------------------------------------------------------------

type QuestionDef = {
  key: string; // q1..q57
  text: string;
  order: number;
  dim: string | null; // dimension code
  subDim: string | null; // sub-dimension ID
  reverse?: boolean;
  type?: 'likert' | 'open_text';
};

const QUESTION_DEFS: QuestionDef[] = [
  // CORE — Psychological Safety (Q1-Q2)
  { key: 'q1', text: 'I feel comfortable admitting mistakes or uncertainties.', order: 1, dim: 'core', subDim: SUB.psychological_safety },
  { key: 'q2', text: "It's safe to bring up problems or tough issues on my team.", order: 2, dim: 'core', subDim: SUB.psychological_safety },
  // CORE — Trust (Q3-Q5)
  { key: 'q3', text: 'I assume my colleagues have positive intentions, even during disagreements.', order: 3, dim: 'core', subDim: SUB.trust },
  { key: 'q4', text: 'I trust that my leaders will follow through on their commitments.', order: 4, dim: 'core', subDim: SUB.trust },
  { key: 'q5', text: 'I trust the information I receive from my leaders.', order: 5, dim: 'core', subDim: SUB.trust },
  // CORE — Fairness & Integrity (Q6-Q8)
  { key: 'q6', text: 'Our purpose and values are evident in everyday actions.', order: 6, dim: 'core', subDim: SUB.fairness_integrity },
  { key: 'q7', text: 'Decisions that affect people in our organization are made fairly and consistently.', order: 7, dim: 'core', subDim: SUB.fairness_integrity },
  { key: 'q8', text: 'People are held to the same standards, regardless of their position or who they are.', order: 8, dim: 'core', subDim: SUB.fairness_integrity },
  // CORE — Purpose & Meaning (Q9-Q11)
  { key: 'q9', text: 'I understand why this organization exists and what it stands for.', order: 9, dim: 'core', subDim: SUB.purpose_meaning },
  { key: 'q10', text: 'The work I do here gives me a sense of personal meaning.', order: 10, dim: 'core', subDim: SUB.purpose_meaning },
  { key: 'q11', text: 'Working here feels consistent with what I stand for personally.', order: 11, dim: 'core', subDim: SUB.purpose_meaning },
  // CORE — Leader Behaviour (Q12-Q13)
  { key: 'q12', text: "Leaders' actions align with what they say.", order: 12, dim: 'core', subDim: SUB.leader_behaviour },
  { key: 'q13', text: 'I often receive mixed messages from different leaders.', order: 13, dim: 'core', subDim: SUB.leader_behaviour, reverse: true },
  // CLARITY — Decision Making (Q14-Q17)
  { key: 'q14', text: 'Priorities often change without clear explanation.', order: 14, dim: 'clarity', subDim: SUB.decision_making, reverse: true },
  { key: 'q15', text: 'The reasons behind major decisions are communicated.', order: 15, dim: 'clarity', subDim: SUB.decision_making },
  { key: 'q16', text: "I don't know what decisions I am allowed to make.", order: 16, dim: 'clarity', subDim: SUB.decision_making, reverse: true },
  { key: 'q17', text: 'When expectations change, I understand why.', order: 17, dim: 'clarity', subDim: SUB.decision_making },
  // CLARITY — Role Clarity (Q18-Q20)
  { key: 'q18', text: "I know what's expected of me in my role.", order: 18, dim: 'clarity', subDim: SUB.role_clarity },
  { key: 'q19', text: 'It\'s clear who is responsible for what on my team.', order: 19, dim: 'clarity', subDim: SUB.role_clarity },
  { key: 'q20', text: "I often do work that I'm not sure if I should be doing because responsibilities aren't clear.", order: 20, dim: 'clarity', subDim: SUB.role_clarity, reverse: true },
  // CLARITY — Strategic Clarity (Q21-Q22)
  { key: 'q21', text: 'I often feel unsure about where the organization is heading.', order: 21, dim: 'clarity', subDim: SUB.strategic_clarity, reverse: true },
  { key: 'q22', text: "I understand how my team's work connects to organizational priorities.", order: 22, dim: 'clarity', subDim: SUB.strategic_clarity },
  // CLARITY — Empowerment (Q23-Q24)
  { key: 'q23', text: 'Our tools and technology make collaboration simple and efficient.', order: 23, dim: 'clarity', subDim: SUB.empowerment },
  { key: 'q24', text: 'I know where to find what I need without asking multiple people.', order: 24, dim: 'clarity', subDim: SUB.empowerment },
  // CLARITY — Goal Alignment (Q25-Q27)
  { key: 'q25', text: 'I can see how my work contributes to something meaningful.', order: 25, dim: 'clarity', subDim: SUB.goal_alignment },
  { key: 'q26', text: "My team's goals clearly support the organization's top priorities.", order: 26, dim: 'clarity', subDim: SUB.goal_alignment },
  { key: 'q27', text: "I sometimes work on things that don't seem connected to any larger goal.", order: 27, dim: 'clarity', subDim: SUB.goal_alignment, reverse: true },
  // CONNECTION — Belonging & Inclusion (Q28-Q31)
  { key: 'q28', text: 'I feel seen and included, regardless of my role.', order: 28, dim: 'connection', subDim: SUB.belonging_inclusion },
  { key: 'q29', text: 'I have fun at work.', order: 29, dim: 'connection', subDim: SUB.belonging_inclusion },
  { key: 'q30', text: 'I feel lonely at work.', order: 30, dim: 'connection', subDim: SUB.belonging_inclusion, reverse: true },
  { key: 'q31', text: 'I feel a genuine sense of belonging here.', order: 31, dim: 'connection', subDim: SUB.belonging_inclusion },
  // CONNECTION — Employee Voice (Q32-Q34)
  { key: 'q32', text: 'I can express a different point of view without negative consequences.', order: 32, dim: 'connection', subDim: SUB.employee_voice },
  { key: 'q33', text: 'When I speak up, my input genuinely influences decisions.', order: 33, dim: 'connection', subDim: SUB.employee_voice },
  { key: 'q34', text: 'Feedback here often goes into a black hole.', order: 34, dim: 'connection', subDim: SUB.employee_voice, reverse: true },
  // CONNECTION — Information Flow (Q35-Q37)
  { key: 'q35', text: 'Communication between all levels of the organization feels open.', order: 35, dim: 'connection', subDim: SUB.information_flow },
  { key: 'q36', text: 'Important information reaches me in time for me to act on it.', order: 36, dim: 'connection', subDim: SUB.information_flow },
  { key: 'q37', text: 'Information flows well between teams, not just within them.', order: 37, dim: 'connection', subDim: SUB.information_flow },
  // CONNECTION — Shared Identity (Q38-Q39)
  { key: 'q38', text: 'Team members look out for each other.', order: 38, dim: 'connection', subDim: SUB.shared_identity },
  { key: 'q39', text: "There is a strong sense of 'we're all in this together' across the organization.", order: 39, dim: 'connection', subDim: SUB.shared_identity },
  // CONNECTION — Involvement (Q40-Q41)
  { key: 'q40', text: 'I have a say in decisions that affect my day-to-day work.', order: 40, dim: 'connection', subDim: SUB.involvement },
  { key: 'q41', text: 'People closest to the work are included in decisions about it.', order: 41, dim: 'connection', subDim: SUB.involvement },
  // CONNECTION — Recognition (Q42-Q43)
  { key: 'q42', text: 'I feel recognized for the contributions that matter most.', order: 42, dim: 'connection', subDim: SUB.recognition },
  { key: 'q43', text: 'Recognition here often feels like a box-ticking exercise rather than genuine appreciation.', order: 43, dim: 'connection', subDim: SUB.recognition, reverse: true },
  // COLLABORATION — Sustainable Pace (Q44-Q45)
  { key: 'q44', text: 'We have the right balance between collaboration time and focus time.', order: 44, dim: 'collaboration', subDim: SUB.sustainable_pace },
  { key: 'q45', text: 'The pace of work here is sustainable over the long term.', order: 45, dim: 'collaboration', subDim: SUB.sustainable_pace },
  // COLLABORATION — Adaptability & Learning (Q46-Q47)
  { key: 'q46', text: 'When something goes wrong, blame is a common first reaction.', order: 46, dim: 'collaboration', subDim: SUB.adaptability_learning, reverse: true },
  { key: 'q47', text: "Our team regularly reflects on what's working and what isn't, and adjusts.", order: 47, dim: 'collaboration', subDim: SUB.adaptability_learning },
  // COLLABORATION — Cross-Functional Coordination (Q48-Q50)
  { key: 'q48', text: "It's easy to access the people or information I need to do my job.", order: 48, dim: 'collaboration', subDim: SUB.cross_functional },
  { key: 'q49', text: 'There are silos in our organization.', order: 49, dim: 'collaboration', subDim: SUB.cross_functional, reverse: true },
  { key: 'q50', text: 'I have opportunities to co-create and problem-solve across functions.', order: 50, dim: 'collaboration', subDim: SUB.cross_functional },
  // COLLABORATION — Ways of Working (Q51-Q52)
  { key: 'q51', text: 'We have the right balance between meetings and focus time.', order: 51, dim: 'collaboration', subDim: SUB.ways_of_working },
  { key: 'q52', text: 'We have clear processes for how we get work done.', order: 52, dim: 'collaboration', subDim: SUB.ways_of_working },
  // COLLABORATION — Ownership & Accountability (Q53-Q55)
  { key: 'q53', text: 'People here follow through on their commitments.', order: 53, dim: 'collaboration', subDim: SUB.ownership_accountability },
  { key: 'q54', text: 'I understand what is expected of me.', order: 54, dim: 'collaboration', subDim: SUB.ownership_accountability },
  { key: 'q55', text: 'Things fall through the cracks because nobody clearly owns them.', order: 55, dim: 'collaboration', subDim: SUB.ownership_accountability, reverse: true },
  // SYSTEM HEALTH — S4 (maps to all 4 dimensions at 0.25 weight)
  { key: 'q56', text: 'I am proud to be a team member at this organization.', order: 56, dim: null, subDim: null },
  // Open-ended
  { key: 'q57', text: 'What is one thing you would change about how your organization communicates?', order: 57, dim: null, subDim: null, type: 'open_text' },
];

const LIKERT_QUESTIONS = QUESTION_DEFS.filter((q) => q.type !== 'open_text');

// ---------------------------------------------------------------------------
// Scenario definitions
// ---------------------------------------------------------------------------

interface ScenarioProfile {
  id: string;
  code: string;
  orgName: string;
  orgSlug: string;
  surveyTitle: string;
  /** Target dimension scores (0-100) */
  targets: { core: number; clarity: number; connection: number; collaboration: number };
  /**
   * Sub-dimension score offsets relative to the dimension target.
   * Keyed by sub-dimension code. Adds visual interest in results.
   */
  subDimOffsets: Record<string, number>;
  /** Open-ended response texts */
  openEndedTexts: string[];
  /** Dialogue keywords with frequencies and sentiment */
  keywords: Array<{ keyword: string; frequency: number; sentiment: 'positive' | 'negative' | 'neutral'; dimCode: string | null }>;
  /** Recommendations */
  recommendations: Array<{
    dimCode: string;
    severity: 'critical' | 'high' | 'medium' | 'healthy';
    priority: number;
    title: string;
    body: string;
    actions: string[];
    trustLadderLink?: string;
    cccServiceLink?: string;
  }>;
}

const SCENARIOS: ScenarioProfile[] = [
  // ── 1. ALIGNED & THRIVING ───────────────────────────────────────────────
  {
    id: '1',
    code: 'aligned',
    orgName: 'Aligned Health Systems',
    orgSlug: 'aligned-health',
    surveyTitle: 'Q1 2026 Culture Assessment — Aligned Health',
    targets: { core: 85, clarity: 80, connection: 80, collaboration: 80 },
    subDimOffsets: {
      psychological_safety: 3, trust: 2, fairness_integrity: -2, purpose_meaning: 5, leader_behaviour: -3,
      decision_making: -2, role_clarity: 3, strategic_clarity: 2, empowerment: -3, goal_alignment: 1,
      belonging_inclusion: 3, employee_voice: 2, information_flow: -2, shared_identity: 3, involvement: -1, recognition: 1,
      sustainable_pace: -3, adaptability_learning: 2, cross_functional: 1, ways_of_working: -2, ownership_accountability: 3,
    },
    openEndedTexts: [
      'Keep investing in the town halls — they make a real difference.',
      'Would love more cross-department social events to build on our connections.',
      'The new onboarding program is fantastic. Maybe extend it to lateral moves too.',
      'Communication is strong overall. Minor: sometimes too many Slack channels to track.',
      'I appreciate the transparency from SLT. More of that during budget season would help.',
      'Honestly, not much to change. Maybe consolidate the weekly email updates.',
      'The quarterly all-hands are great but could use more Q&A time.',
      'Continue the lunch-and-learn series — it builds cross-team understanding.',
      'More celebration of small wins, not just big milestones.',
      'Everything is working well. Keep up the listening lab sessions.',
    ],
    keywords: [
      { keyword: 'Transparency', frequency: 28, sentiment: 'positive', dimCode: 'clarity' },
      { keyword: 'Town halls', frequency: 24, sentiment: 'positive', dimCode: 'connection' },
      { keyword: 'Teamwork', frequency: 22, sentiment: 'positive', dimCode: 'collaboration' },
      { keyword: 'Trust', frequency: 20, sentiment: 'positive', dimCode: 'core' },
      { keyword: 'Recognition', frequency: 18, sentiment: 'positive', dimCode: 'connection' },
      { keyword: 'Slack channels', frequency: 15, sentiment: 'neutral', dimCode: 'clarity' },
      { keyword: 'Onboarding', frequency: 12, sentiment: 'positive', dimCode: 'clarity' },
      { keyword: 'Growth', frequency: 11, sentiment: 'positive', dimCode: 'collaboration' },
      { keyword: 'Values', frequency: 10, sentiment: 'positive', dimCode: 'core' },
      { keyword: 'Cross-team', frequency: 9, sentiment: 'positive', dimCode: 'collaboration' },
    ],
    recommendations: [
      {
        dimCode: 'collaboration', severity: 'healthy', priority: 1,
        title: 'Sustain collaboration culture',
        body: 'Collaboration scores are strong across the board. Continue the practices that got you here — cross-functional project teams, shared retrospectives, and open knowledge-sharing channels.',
        actions: ['Continue cross-functional lunch-and-learns', 'Expand peer recognition program', 'Document collaboration rituals in onboarding'],
      },
      {
        dimCode: 'clarity', severity: 'medium', priority: 2,
        title: 'Consolidate communication channels',
        body: 'While clarity scores are high, some respondents noted channel proliferation. A small refinement to reduce noise would prevent future drift.',
        actions: ['Audit and archive unused Slack channels', 'Establish a single source of truth for announcements', 'Add channel purpose descriptions'],
      },
      {
        dimCode: 'core', severity: 'healthy', priority: 3,
        title: 'Deepen purpose connection for new hires',
        body: 'Core scores are excellent. Extending the strong onboarding experience to lateral transfers and role changes will protect this foundation as the organization grows.',
        actions: ['Create lateral-move onboarding module', 'Add purpose-alignment check-in at 90-day review'],
      },
    ],
  },

  // ── 2. COMMAND & CONTROL ────────────────────────────────────────────────
  {
    id: '2',
    code: 'command_and_control',
    orgName: 'Apex Financial Group',
    orgSlug: 'apex-financial',
    surveyTitle: 'Q1 2026 Culture Assessment — Apex Financial',
    targets: { core: 50, clarity: 75, connection: 30, collaboration: 35 },
    subDimOffsets: {
      psychological_safety: -8, trust: -3, fairness_integrity: 2, purpose_meaning: 3, leader_behaviour: 5,
      decision_making: 5, role_clarity: 8, strategic_clarity: 3, empowerment: -5, goal_alignment: -3,
      belonging_inclusion: -5, employee_voice: -10, information_flow: -3, shared_identity: -2, involvement: -8, recognition: 2,
      sustainable_pace: -5, adaptability_learning: -3, cross_functional: -8, ways_of_working: 5, ownership_accountability: 3,
    },
    openEndedTexts: [
      'Decisions come from the top and we just execute. No room for input.',
      'The direction is clear but I wish we had more say in how we get there.',
      'People are afraid to speak up in meetings. It is not safe.',
      'Role clarity is excellent — everyone knows their box. But the boxes don\'t talk to each other.',
      'Leadership communicates well downward but never listens upward.',
      'I don\'t feel comfortable bringing bad news to my manager.',
      'Cross-department projects are nearly impossible due to territorial politics.',
      'We need actual feedback loops, not suggestion boxes that go nowhere.',
      'The strategy is clear but the culture feels cold and transactional.',
      'More peer collaboration opportunities — we\'re all working in isolation.',
      'I would change everything about how feedback is handled here.',
      'Managers should be trained to listen, not just direct.',
    ],
    keywords: [
      { keyword: 'Top-down', frequency: 42, sentiment: 'negative', dimCode: 'connection' },
      { keyword: 'Fear', frequency: 35, sentiment: 'negative', dimCode: 'core' },
      { keyword: 'No voice', frequency: 31, sentiment: 'negative', dimCode: 'connection' },
      { keyword: 'Hierarchy', frequency: 28, sentiment: 'negative', dimCode: 'clarity' },
      { keyword: 'Silos', frequency: 25, sentiment: 'negative', dimCode: 'collaboration' },
      { keyword: 'Directives', frequency: 22, sentiment: 'neutral', dimCode: 'clarity' },
      { keyword: 'Compliance', frequency: 20, sentiment: 'neutral', dimCode: 'clarity' },
      { keyword: 'Isolation', frequency: 18, sentiment: 'negative', dimCode: 'connection' },
      { keyword: 'Territorial', frequency: 15, sentiment: 'negative', dimCode: 'collaboration' },
      { keyword: 'Role clarity', frequency: 14, sentiment: 'positive', dimCode: 'clarity' },
      { keyword: 'Cold', frequency: 12, sentiment: 'negative', dimCode: 'core' },
      { keyword: 'Transactional', frequency: 10, sentiment: 'negative', dimCode: 'connection' },
    ],
    recommendations: [
      {
        dimCode: 'connection', severity: 'critical', priority: 1,
        title: 'Rebuild psychological safety and employee voice',
        body: 'Connection scores are critically low (30%). People do not feel safe speaking up and feedback channels are perceived as performative. Without psychological safety, the organization cannot detect emerging risks.',
        actions: ['Launch anonymous skip-level listening sessions', 'Train managers on active listening and psychological safety', 'Implement structured upward feedback with visible follow-through', 'Create peer-facilitated discussion circles'],
        trustLadderLink: 'Relationship (Rung 6)',
        cccServiceLink: 'Listening Labs',
      },
      {
        dimCode: 'collaboration', severity: 'critical', priority: 2,
        title: 'Break down organizational silos',
        body: 'Collaboration is severely constrained by territorial boundaries. Cross-functional work is described as "nearly impossible." Information and people are trapped within vertical hierarchies.',
        actions: ['Create cross-functional task forces for key initiatives', 'Rotate leadership meeting attendance across departments', 'Establish shared OKRs that require cross-team delivery'],
        trustLadderLink: 'Processes & Platforms (Rung 8)',
        cccServiceLink: 'Team Workshop',
      },
      {
        dimCode: 'core', severity: 'high', priority: 3,
        title: 'Strengthen trust in leadership',
        body: 'Core scores sit at the fragile threshold (50%). While leaders are seen as competent, they are not trusted to listen or act on employee input. The gap between stated values and lived experience is eroding trust.',
        actions: ['Commit to "you said, we did" public accountability reports', 'Include employee voice metrics in leadership performance reviews', 'Hold quarterly open-door sessions with SLT'],
        trustLadderLink: 'Purpose (Rung 1)',
        cccServiceLink: 'Executive Coaching',
      },
    ],
  },

  // ── 3. WELL-INTENTIONED BUT DISCONNECTED ────────────────────────────────
  {
    id: '3',
    code: 'well_intentioned',
    orgName: 'Harmony Foundation',
    orgSlug: 'harmony-foundation',
    surveyTitle: 'Q1 2026 Culture Assessment — Harmony Foundation',
    targets: { core: 55, clarity: 55, connection: 45, collaboration: 50 },
    subDimOffsets: {
      psychological_safety: 5, trust: 3, fairness_integrity: 2, purpose_meaning: 8, leader_behaviour: -5,
      decision_making: -8, role_clarity: -5, strategic_clarity: -3, empowerment: 3, goal_alignment: -2,
      belonging_inclusion: 5, employee_voice: 2, information_flow: -3, shared_identity: 3, involvement: 2, recognition: 5,
      sustainable_pace: -3, adaptability_learning: 2, cross_functional: -5, ways_of_working: -3, ownership_accountability: 2,
    },
    openEndedTexts: [
      'Everyone here cares deeply but we lack clear direction from leadership.',
      'I love the mission but sometimes I have no idea what I should be working on.',
      'Leaders mean well but decisions change weekly without explanation.',
      'The culture is warm and supportive but we need more structure.',
      'We have great people doing good work — but nobody coordinates it.',
      'I wish our passion for the mission translated into clearer priorities.',
      'There is genuine care here. We just need more organizational backbone.',
      'Too many good ideas, not enough follow-through or prioritization.',
      'The intent is always positive but impact is inconsistent.',
      'We need decision-making frameworks, not just good intentions.',
      'Love the team, frustrated by the lack of clarity on roles.',
      'Communication is warm but vague. I need specifics.',
    ],
    keywords: [
      { keyword: 'Good intentions', frequency: 38, sentiment: 'neutral', dimCode: 'core' },
      { keyword: 'No direction', frequency: 32, sentiment: 'negative', dimCode: 'clarity' },
      { keyword: 'Mission-driven', frequency: 28, sentiment: 'positive', dimCode: 'core' },
      { keyword: 'Disorganized', frequency: 25, sentiment: 'negative', dimCode: 'clarity' },
      { keyword: 'Caring', frequency: 24, sentiment: 'positive', dimCode: 'connection' },
      { keyword: 'Unclear roles', frequency: 22, sentiment: 'negative', dimCode: 'clarity' },
      { keyword: 'Changing priorities', frequency: 20, sentiment: 'negative', dimCode: 'clarity' },
      { keyword: 'Warm culture', frequency: 18, sentiment: 'positive', dimCode: 'connection' },
      { keyword: 'No follow-through', frequency: 16, sentiment: 'negative', dimCode: 'collaboration' },
      { keyword: 'Purpose', frequency: 14, sentiment: 'positive', dimCode: 'core' },
      { keyword: 'Vague', frequency: 12, sentiment: 'negative', dimCode: 'clarity' },
    ],
    recommendations: [
      {
        dimCode: 'clarity', severity: 'high', priority: 1,
        title: 'Establish decision-making frameworks',
        body: 'Clarity scores (55%) reveal a pattern of changing priorities and undefined decision rights. People feel supported but directionless. The gap between intention and impact stems from structural ambiguity, not lack of care.',
        actions: ['Implement a RACI matrix for all active initiatives', 'Establish and communicate quarterly priority commitments (max 3)', 'Create a decision log visible to all staff', 'Train leaders on communicating the "why" behind priority changes'],
        trustLadderLink: 'Strategic Priorities (Rung 4)',
        cccServiceLink: 'Executive Coaching',
      },
      {
        dimCode: 'clarity', severity: 'high', priority: 2,
        title: 'Clarify roles and responsibilities',
        body: 'Role clarity is significantly below the dimension average. People are doing work they\'re not sure they should be doing. This creates inefficiency and quiet frustration that erodes the warm culture over time.',
        actions: ['Conduct role-clarity workshops per team', 'Publish updated role descriptions with clear ownership boundaries', 'Add role clarity to 1:1 agenda templates'],
        trustLadderLink: 'Role Clarification (Rung 5)',
        cccServiceLink: 'Team Workshop',
      },
      {
        dimCode: 'collaboration', severity: 'medium', priority: 3,
        title: 'Improve cross-functional coordination',
        body: 'Collaboration is moderate (50%) but cross-functional work suffers from lack of coordination structure. Good work happens within teams but doesn\'t connect across functions.',
        actions: ['Establish cross-functional project rituals (standups, retrospectives)', 'Create shared workspace for multi-team initiatives', 'Appoint cross-functional liaisons for key projects'],
        cccServiceLink: 'Team Workshop',
      },
      {
        dimCode: 'core', severity: 'medium', priority: 4,
        title: 'Bridge the say-do gap in leadership',
        body: 'Leader behaviour scores lag behind other Core sub-dimensions. People trust leaders\' intentions but not their consistency. Closing this gap will reinforce the strong purpose and meaning scores.',
        actions: ['Introduce leadership commitment tracking', 'Schedule regular "ask me anything" sessions with SLT', 'Model vulnerability by sharing lessons from leadership mistakes'],
        trustLadderLink: 'Purpose (Rung 1)',
      },
    ],
  },

  // ── 4. OVER-COLLABORATED ────────────────────────────────────────────────
  {
    id: '4',
    code: 'over_collaborated',
    orgName: 'Matrix Solutions Inc.',
    orgSlug: 'matrix-solutions',
    surveyTitle: 'Q1 2026 Culture Assessment — Matrix Solutions',
    targets: { core: 60, clarity: 40, connection: 80, collaboration: 85 },
    subDimOffsets: {
      psychological_safety: 5, trust: 2, fairness_integrity: -3, purpose_meaning: -2, leader_behaviour: -5,
      decision_making: -8, role_clarity: -5, strategic_clarity: -3, empowerment: 3, goal_alignment: -5,
      belonging_inclusion: 3, employee_voice: 5, information_flow: 2, shared_identity: 3, involvement: 5, recognition: 2,
      sustainable_pace: -10, adaptability_learning: 3, cross_functional: 5, ways_of_working: -5, ownership_accountability: 2,
    },
    openEndedTexts: [
      'We have a meeting for everything. I spend 80% of my day in meetings.',
      'Consensus culture means nothing gets decided. Every decision takes weeks.',
      'The relationships here are amazing but we need fewer committees and more action.',
      'I love my colleagues but we are drowning in collaboration overhead.',
      'Everything requires buy-in from 15 people. Can someone just decide?',
      'Sustainable pace? What sustainable pace? I work evenings just to get actual work done.',
      'We collaborate beautifully. We just never ship anything on time.',
      'Someone needs to own decisions instead of sending them to another committee.',
      'Great culture, terrible execution. We need decision rights, not more huddles.',
      'The best thing and worst thing about this place is the same: we involve everyone in everything.',
      'Please reduce the number of recurring meetings by at least 50%.',
      'I am exhausted from collaborative overload.',
    ],
    keywords: [
      { keyword: 'Too many meetings', frequency: 52, sentiment: 'negative', dimCode: 'collaboration' },
      { keyword: 'Consensus paralysis', frequency: 38, sentiment: 'negative', dimCode: 'clarity' },
      { keyword: 'No decisions', frequency: 35, sentiment: 'negative', dimCode: 'clarity' },
      { keyword: 'Great relationships', frequency: 30, sentiment: 'positive', dimCode: 'connection' },
      { keyword: 'Burnout', frequency: 28, sentiment: 'negative', dimCode: 'collaboration' },
      { keyword: 'Committees', frequency: 24, sentiment: 'negative', dimCode: 'collaboration' },
      { keyword: 'Slow', frequency: 22, sentiment: 'negative', dimCode: 'collaboration' },
      { keyword: 'Buy-in', frequency: 20, sentiment: 'neutral', dimCode: 'clarity' },
      { keyword: 'Inclusive', frequency: 18, sentiment: 'positive', dimCode: 'connection' },
      { keyword: 'Exhausted', frequency: 16, sentiment: 'negative', dimCode: 'collaboration' },
      { keyword: 'Ownership', frequency: 14, sentiment: 'negative', dimCode: 'clarity' },
      { keyword: 'Ship', frequency: 10, sentiment: 'negative', dimCode: 'collaboration' },
    ],
    recommendations: [
      {
        dimCode: 'clarity', severity: 'critical', priority: 1,
        title: 'Establish clear decision authority',
        body: 'Clarity scores are critically low (40%), driven by consensus paralysis. Every decision requires broad buy-in, creating bottlenecks and exhaustion. Decision rights must be explicitly assigned.',
        actions: ['Define decision authority levels (individual, team, committee, SLT)', 'Implement a "single-threaded owner" model for key initiatives', 'Create a decision-making playbook with escalation criteria', 'Audit and sunset 50% of recurring committees'],
        trustLadderLink: 'Strategic Priorities (Rung 4)',
        cccServiceLink: 'Executive Coaching',
      },
      {
        dimCode: 'collaboration', severity: 'high', priority: 2,
        title: 'Reduce collaboration overhead and protect focus time',
        body: 'Despite high collaboration scores (85%), sustainable pace is critically low. People report spending 80% of time in meetings and working evenings to do actual work. The strength has become a liability.',
        actions: ['Implement "No Meeting" blocks (minimum 4 hours/day)', 'Reduce meeting default from 60 to 25 minutes', 'Require agendas and decision owners for all meetings', 'Cancel any recurring meeting without a clear purpose'],
        trustLadderLink: 'Processes & Platforms (Rung 8)',
        cccServiceLink: 'Team Workshop',
      },
      {
        dimCode: 'core', severity: 'medium', priority: 3,
        title: 'Reconnect collaboration to purpose',
        body: 'Core scores (60%) are moderate, with purpose and meaning lagging. The high volume of collaborative activity has become disconnected from meaningful outcomes. People are collaborating for its own sake.',
        actions: ['Link every collaboration ritual to a stated purpose', 'Celebrate shipped outcomes, not meeting attendance', 'Add "so what" check to all standing meetings'],
        trustLadderLink: 'Mission/Vision (Rung 3)',
      },
    ],
  },

  // ── 5. BUSY BUT BURNED OUT ──────────────────────────────────────────────
  {
    id: '5',
    code: 'busy_but_burned',
    orgName: 'Metro General Hospital',
    orgSlug: 'metro-general',
    surveyTitle: 'Q1 2026 Culture Assessment — Metro General',
    targets: { core: 30, clarity: 35, connection: 25, collaboration: 40 },
    subDimOffsets: {
      psychological_safety: -8, trust: -5, fairness_integrity: -3, purpose_meaning: 5, leader_behaviour: -5,
      decision_making: -5, role_clarity: 3, strategic_clarity: -3, empowerment: -5, goal_alignment: 2,
      belonging_inclusion: -3, employee_voice: -5, information_flow: -8, shared_identity: 2, involvement: -5, recognition: -3,
      sustainable_pace: -10, adaptability_learning: -3, cross_functional: -5, ways_of_working: -3, ownership_accountability: 5,
    },
    openEndedTexts: [
      'I am exhausted. We are all exhausted. Something has to change.',
      'Communication is broken at every level. I learn about changes through the grapevine.',
      'There is no trust here. People protect themselves instead of helping each other.',
      'I came here because I care about patients. The organization makes it hard to keep caring.',
      'Turnover is through the roof and nobody is talking about why.',
      'Leadership is invisible. I do not know who makes decisions or why.',
      'We are doing more with less every quarter and nobody acknowledges it.',
      'I feel disconnected from my team and completely disconnected from the organization.',
      'The only thing that keeps me here is the patients, not the culture.',
      'Communication? What communication? We find out about our own restructuring from news articles.',
      'Morale is the lowest I have seen in 15 years. People are leaving in droves.',
      'We need to stop pretending everything is fine. It is not.',
    ],
    keywords: [
      { keyword: 'Burnout', frequency: 58, sentiment: 'negative', dimCode: 'collaboration' },
      { keyword: 'Exhausted', frequency: 45, sentiment: 'negative', dimCode: 'collaboration' },
      { keyword: 'Turnover', frequency: 42, sentiment: 'negative', dimCode: 'connection' },
      { keyword: 'No trust', frequency: 38, sentiment: 'negative', dimCode: 'core' },
      { keyword: 'Disconnected', frequency: 35, sentiment: 'negative', dimCode: 'connection' },
      { keyword: 'Invisible leadership', frequency: 30, sentiment: 'negative', dimCode: 'core' },
      { keyword: 'Grapevine', frequency: 25, sentiment: 'negative', dimCode: 'clarity' },
      { keyword: 'Understaffed', frequency: 22, sentiment: 'negative', dimCode: 'collaboration' },
      { keyword: 'Morale', frequency: 20, sentiment: 'negative', dimCode: 'core' },
      { keyword: 'Patients', frequency: 18, sentiment: 'positive', dimCode: 'core' },
      { keyword: 'Restructuring', frequency: 15, sentiment: 'negative', dimCode: 'clarity' },
      { keyword: 'Leaving', frequency: 14, sentiment: 'negative', dimCode: 'connection' },
    ],
    recommendations: [
      {
        dimCode: 'core', severity: 'critical', priority: 1,
        title: 'Immediate intervention: rebuild trust foundation',
        body: 'Core scores are broken (30%). Psychological safety is critically low, trust in leadership is near zero, and people feel invisible. Without addressing the foundation, no other intervention will succeed.',
        actions: ['SLT to hold immediate all-staff address acknowledging the crisis', 'Launch confidential listening labs within 2 weeks', 'Appoint a Chief People Officer or equivalent if not already in place', 'Commit to monthly public progress updates on culture actions'],
        trustLadderLink: 'Purpose (Rung 1)',
        cccServiceLink: 'Listening Labs',
      },
      {
        dimCode: 'connection', severity: 'critical', priority: 2,
        title: 'Address disconnection and turnover crisis',
        body: 'Connection scores are critically low (25%). People feel isolated and are leaving. The information vacuum is being filled by rumors and grapevine. Formal connection channels must be rebuilt.',
        actions: ['Establish regular team check-ins focused on wellbeing, not just tasks', 'Create transparent communication cadence (weekly brief, monthly town hall)', 'Implement stay interviews for high-risk roles', 'Stand up an employee advisory council with real authority'],
        trustLadderLink: 'Relationship (Rung 6)',
        cccServiceLink: 'Listening Labs',
      },
      {
        dimCode: 'collaboration', severity: 'high', priority: 3,
        title: 'Address unsustainable workload',
        body: 'Sustainable pace is extremely low. People are doing more with less every quarter without acknowledgment. Burnout is driving turnover, creating a vicious cycle.',
        actions: ['Conduct workload audit across all departments', 'Establish minimum staffing thresholds with automatic escalation', 'Authorize overtime and temporary staffing for critical gaps', 'Train managers to recognize and respond to burnout signals'],
        trustLadderLink: 'Processes & Platforms (Rung 8)',
        cccServiceLink: 'Executive Coaching',
      },
      {
        dimCode: 'clarity', severity: 'high', priority: 4,
        title: 'Restore basic communication infrastructure',
        body: 'Clarity scores (35%) reflect a communication vacuum. People learn about their own restructuring from external sources. Basic communication channels must be rebuilt before any strategic messaging can land.',
        actions: ['Audit all communication channels and identify gaps', 'Establish "no surprises" policy: affected staff hear news first', 'Create department-level communication liaisons', 'Rebuild intranet with current, accurate information'],
        trustLadderLink: 'Mission/Vision (Rung 3)',
        cccServiceLink: 'Team Workshop',
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Deterministic ID helpers
// ---------------------------------------------------------------------------

/** Generate a deterministic UUID for scenario entities. */
function scenarioUuid(scenarioIdx: number, entity: string, subIdx?: number): string {
  // Format: 10000000-0000-000S-EEEE-NNNNNNNNNNNN
  // S = scenario (1-5), EEEE = entity type, N = sub-index
  const s = scenarioIdx.toString();
  const entityMap: Record<string, string> = {
    org: '0001',
    survey: '0002',
    deployment: '0003',
    question: '0004',
    response: '0005',
  };
  const e = entityMap[entity] ?? '9999';
  const n = (subIdx ?? 0).toString().padStart(12, '0');
  return `10000000-0000-000${s}-${e}-${n}`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Generate a Likert value (1-5) centered on a target score (0-100).
 * Uses a two-value base distribution for accuracy, with occasional
 * wider spread for realistic variance.
 */
function generateLikertValue(targetScore: number): number {
  const targetRaw = Math.max(1, Math.min(SCALE_SIZE, (targetScore / 100) * (SCALE_SIZE - 1) + 1));
  const lower = Math.max(1, Math.floor(targetRaw));
  const upper = Math.min(SCALE_SIZE, Math.ceil(targetRaw));
  const frac = targetRaw - lower; // probability of upper value

  const r = Math.random();

  if (r < 0.70) {
    // 70%: precise two-value distribution (hits target average exactly)
    return Math.random() < frac ? upper : lower;
  } else if (r < 0.85) {
    // 15%: one step below (creates natural variance)
    return Math.max(1, lower - 1);
  } else {
    // 15%: one step above
    return Math.min(SCALE_SIZE, upper + 1);
  }
}

/** Get the effective target score for a question, accounting for sub-dimension offsets. */
function getQuestionTarget(
  q: QuestionDef,
  scenario: ScenarioProfile,
): number {
  if (q.dim === null) {
    // S4 question: average of all dimension targets
    const { core, clarity, connection, collaboration } = scenario.targets;
    return (core + clarity + connection + collaboration) / 4;
  }

  const dimTarget = scenario.targets[q.dim as keyof typeof scenario.targets];
  if (!q.subDim) return dimTarget;

  // Find the sub-dimension code from the SUB ID
  const subDimCode = Object.entries(SUB).find(([, id]) => id === q.subDim)?.[0];
  const offset = subDimCode ? (scenario.subDimOffsets[subDimCode] ?? 0) : 0;
  return Math.max(0, Math.min(100, dimTarget + offset));
}

/** Compute dimension scores from a set of answers, handling reverse scoring. */
function computeScores(
  answers: Array<{ questionDef: QuestionDef; value: number }>,
  dimMap: Record<string, string>,
): Record<string, { score: number; rawScore: number; count: number }> {
  const buckets: Record<string, { total: number; count: number; weightedTotal: number; weightedCount: number }> = {};

  for (const { questionDef, value } of answers) {
    // Apply reverse scoring
    const normalized = questionDef.reverse
      ? (SCALE_SIZE + 1) - value
      : value;

    if (questionDef.dim) {
      // Standard question: weight 1.0 to one dimension
      const dimId = dimMap[questionDef.dim];
      if (!buckets[dimId]) buckets[dimId] = { total: 0, count: 0, weightedTotal: 0, weightedCount: 0 };
      buckets[dimId].total += normalized;
      buckets[dimId].count += 1;
    } else if (questionDef.order === 56) {
      // S4: weight 0.25 to each dimension
      for (const code of ['core', 'clarity', 'connection', 'collaboration']) {
        const dimId = dimMap[code];
        if (!buckets[dimId]) buckets[dimId] = { total: 0, count: 0, weightedTotal: 0, weightedCount: 0 };
        buckets[dimId].weightedTotal += normalized * 0.25;
        buckets[dimId].weightedCount += 0.25;
      }
    }
  }

  const result: Record<string, { score: number; rawScore: number; count: number }> = {};
  for (const [dimId, bucket] of Object.entries(buckets)) {
    const totalVal = bucket.total + bucket.weightedTotal;
    const totalWeight = bucket.count + bucket.weightedCount;
    const rawScore = totalWeight > 0 ? totalVal / totalWeight : 1;
    const score = ((rawScore - 1) / (SCALE_SIZE - 1)) * 100;
    result[dimId] = {
      score: Math.round(score * 100) / 100,
      rawScore: Math.round(rawScore * 100) / 100,
      count: bucket.count, // Only full-weight answers count for response_count
    };
  }

  return result;
}

// ---------------------------------------------------------------------------
// Seed functions
// ---------------------------------------------------------------------------

async function lookupDimensions(): Promise<Record<string, string>> {
  const { data } = await supabase.from('dimensions').select('id, code');
  if (!data || data.length === 0) {
    console.error('No dimensions found — run migrations first.');
    process.exit(1);
  }
  return Object.fromEntries(data.map((d) => [d.code, d.id]));
}

async function seedScenarioOrgs(): Promise<void> {
  console.log('Creating scenario organizations...');

  const orgs = SCENARIOS.map((s) => ({
    id: scenarioUuid(parseInt(s.id), 'org'),
    name: s.orgName,
    slug: s.orgSlug,
    settings: {
      timezone: 'America/Toronto',
      anonymityThreshold: 5,
      metadata: {
        departments: DEPARTMENTS,
        roles: ROLES,
        locations: LOCATIONS,
        tenureBands: TENURES,
      },
    },
  }));

  const { error } = await supabase.from('organizations').upsert(orgs, { onConflict: 'id' });
  if (error) {
    console.error(`  FAILED: ${error.message}`);
  } else {
    console.log(`  ${orgs.length} organizations`);
  }
}

async function seedScenarioSurveys(): Promise<void> {
  console.log('Creating scenario surveys...');

  const surveys = SCENARIOS.map((s) => ({
    id: scenarioUuid(parseInt(s.id), 'survey'),
    organization_id: scenarioUuid(parseInt(s.id), 'org'),
    template_id: '00000000-0000-0000-0000-000000000010', // shared template from seed-dev
    title: s.surveyTitle,
    status: 'closed',
    opens_at: '2025-10-01T00:00:00Z',
    closes_at: '2025-12-31T23:59:59Z',
    scores_calculated: true,
  }));

  const { error } = await supabase.from('surveys').upsert(surveys, { onConflict: 'id' });
  if (error) {
    console.error(`  FAILED: ${error.message}`);
  } else {
    console.log(`  ${surveys.length} surveys`);
  }
}

async function seedScenarioQuestions(dimMap: Record<string, string>): Promise<void> {
  console.log('Creating scenario questions (57 × 5 = 285)...');

  for (const scenario of SCENARIOS) {
    const sIdx = parseInt(scenario.id);
    const surveyId = scenarioUuid(sIdx, 'survey');

    // Upsert questions
    const questions = QUESTION_DEFS.map((q, i) => ({
      id: scenarioUuid(sIdx, 'question', i + 1),
      survey_id: surveyId,
      text: q.text,
      type: q.type ?? 'likert',
      order_index: q.order,
      reverse_scored: q.reverse ?? false,
      sub_dimension_id: q.subDim ?? null,
    }));

    const { error: qErr } = await supabase.from('questions').upsert(questions, { onConflict: 'id' });
    if (qErr) {
      console.error(`  questions for ${scenario.code} FAILED: ${qErr.message}`);
      continue;
    }

    // Delete existing dimension mappings then re-insert
    for (const q of QUESTION_DEFS) {
      const qId = scenarioUuid(sIdx, 'question', q.order);
      await supabase.from('question_dimensions').delete().eq('question_id', qId);
    }

    // Build dimension mappings
    const mappings: Array<{ question_id: string; dimension_id: string; weight: number }> = [];

    for (const q of QUESTION_DEFS) {
      const qId = scenarioUuid(sIdx, 'question', q.order);

      if (q.dim) {
        mappings.push({ question_id: qId, dimension_id: dimMap[q.dim], weight: 1.0 });
      } else if (q.order === 56) {
        for (const code of ['core', 'clarity', 'connection', 'collaboration']) {
          mappings.push({ question_id: qId, dimension_id: dimMap[code], weight: 0.25 });
        }
      }
    }

    const { error: mErr } = await supabase.from('question_dimensions').insert(mappings);
    if (mErr) {
      console.error(`  mappings for ${scenario.code} FAILED: ${mErr.message}`);
    }
  }

  console.log('  done');
}

async function seedScenarioDeployments(): Promise<void> {
  console.log('Creating scenario deployments...');

  const deployments = SCENARIOS.map((s) => ({
    id: scenarioUuid(parseInt(s.id), 'deployment'),
    survey_id: scenarioUuid(parseInt(s.id), 'survey'),
    type: 'anonymous_link',
    is_active: false, // surveys are closed
    opens_at: '2025-10-01T00:00:00Z',
    closes_at: '2025-12-31T23:59:59Z',
  }));

  const { error } = await supabase.from('deployments').upsert(deployments, { onConflict: 'id' });
  if (error) {
    console.error(`  FAILED: ${error.message}`);
  } else {
    console.log(`  ${deployments.length} deployments`);
  }
}

interface GeneratedAnswer {
  questionDef: QuestionDef;
  questionId: string;
  value: number; // raw Likert value (before reverse scoring)
}

interface GeneratedResponse {
  responseId: string;
  department: string;
  role: string;
  location: string;
  tenure: string;
  answers: GeneratedAnswer[];
  openEndedText: string;
}

function generateResponses(scenario: ScenarioProfile): GeneratedResponse[] {
  const sIdx = parseInt(scenario.id);
  const responses: GeneratedResponse[] = [];

  // Build department assignments (10, 8, 7, 7, 3)
  const deptAssignments: string[] = [];
  for (let d = 0; d < DEPARTMENTS.length; d++) {
    for (let n = 0; n < DEPT_DISTRIBUTION[d]; n++) {
      deptAssignments.push(DEPARTMENTS[d]);
    }
  }

  for (let i = 0; i < RESPONSE_COUNT; i++) {
    const responseId = scenarioUuid(sIdx, 'response', i + 1);
    const department = deptAssignments[i];
    const role = ROLES[i % ROLES.length];
    const location = LOCATIONS[i % LOCATIONS.length];
    const tenure = TENURES[i % TENURES.length];

    // Add per-department variation, centered so weighted average ≈ 0
    const deptIdx = DEPARTMENTS.indexOf(department);
    const rawOffsets = [-6, -3, 0, 3, 6];
    const weightedMean = rawOffsets.reduce((s, o, i) => s + o * DEPT_DISTRIBUTION[i], 0) / RESPONSE_COUNT;
    const deptOffset = rawOffsets[deptIdx] - weightedMean;

    const answers: GeneratedAnswer[] = [];
    for (const q of LIKERT_QUESTIONS) {
      const baseTarget = getQuestionTarget(q, scenario);
      const adjustedTarget = Math.max(0, Math.min(100, baseTarget + deptOffset));
      // For reverse-scored questions, generate low raw values that will flip
      // to high after reverse scoring in computeScores.
      const genTarget = q.reverse ? (100 - adjustedTarget) : adjustedTarget;
      answers.push({
        questionDef: q,
        questionId: scenarioUuid(sIdx, 'question', q.order),
        value: generateLikertValue(genTarget),
      });
    }

    responses.push({
      responseId,
      department,
      role,
      location,
      tenure,
      answers,
      openEndedText: scenario.openEndedTexts[i % scenario.openEndedTexts.length],
    });
  }

  return responses;
}

async function seedScenarioResponses(): Promise<Map<string, GeneratedResponse[]>> {
  console.log('Creating scenario responses and answers...');

  const allResponses = new Map<string, GeneratedResponse[]>();

  for (const scenario of SCENARIOS) {
    const sIdx = parseInt(scenario.id);
    const deploymentId = scenarioUuid(sIdx, 'deployment');
    const openQuestionId = scenarioUuid(sIdx, 'question', 57);

    // Delete existing responses for this deployment
    await supabase.from('responses').delete().eq('deployment_id', deploymentId);

    const generated = generateResponses(scenario);
    allResponses.set(scenario.code, generated);

    for (let i = 0; i < generated.length; i++) {
      const gen = generated[i];

      // Insert response
      const { data: response, error: rErr } = await supabase.from('responses').insert({
        id: gen.responseId,
        deployment_id: deploymentId,
        session_token: `scenario-${scenario.code}-${i.toString().padStart(3, '0')}`,
        metadata_department: gen.department,
        metadata_role: gen.role,
        metadata_location: gen.location,
        metadata_tenure: gen.tenure,
        submitted_at: new Date(Date.parse('2025-12-15T00:00:00Z') + i * 3600000).toISOString(),
        is_complete: true,
      }).select('id').single();

      if (rErr || !response) {
        console.error(`  response ${i} for ${scenario.code} FAILED: ${rErr?.message}`);
        continue;
      }

      // Build answer rows
      const answerRows = gen.answers.map((a) => ({
        response_id: response.id,
        question_id: a.questionId,
        likert_value: a.value,
        open_text_value: null as string | null,
      }));

      // Add open-ended answer
      answerRows.push({
        response_id: response.id,
        question_id: openQuestionId,
        likert_value: null as unknown as number,
        open_text_value: gen.openEndedText,
      });

      const { error: aErr } = await supabase.from('answers').insert(answerRows);
      if (aErr) {
        console.error(`  answers for ${scenario.code} response ${i} FAILED: ${aErr.message}`);
      }
    }

    console.log(`  ${scenario.code}: ${generated.length} responses`);
  }

  return allResponses;
}

async function seedScenarioScores(
  dimMap: Record<string, string>,
  allResponses: Map<string, GeneratedResponse[]>,
): Promise<void> {
  console.log('Computing and inserting scores...');

  for (const scenario of SCENARIOS) {
    const sIdx = parseInt(scenario.id);
    const surveyId = scenarioUuid(sIdx, 'survey');
    const generated = allResponses.get(scenario.code);
    if (!generated) continue;

    // Delete existing scores for this survey
    await supabase.from('scores').delete().eq('survey_id', surveyId);

    const scoreRows: Array<{
      survey_id: string;
      dimension_id: string;
      segment_type: string;
      segment_value: string;
      score: number;
      raw_score: number;
      response_count: number;
    }> = [];

    // Helper to compute scores for a subset of responses
    const computeForGroup = (
      responses: GeneratedResponse[],
      segmentType: string,
      segmentValue: string,
    ): void => {
      // Collect all answers from the group
      const allAnswers = responses.flatMap((r) => r.answers);
      const scores = computeScores(allAnswers, dimMap);

      for (const [dimId, s] of Object.entries(scores)) {
        scoreRows.push({
          survey_id: surveyId,
          dimension_id: dimId,
          segment_type: segmentType,
          segment_value: segmentValue,
          score: s.score,
          raw_score: s.rawScore,
          response_count: responses.length,
        });
      }
    };

    // Overall
    computeForGroup(generated, 'overall', 'all');

    // Per department
    for (const dept of DEPARTMENTS) {
      const group = generated.filter((r) => r.department === dept);
      if (group.length > 0) computeForGroup(group, 'department', dept);
    }

    // Per role
    for (const role of ROLES) {
      const group = generated.filter((r) => r.role === role);
      if (group.length > 0) computeForGroup(group, 'role', role);
    }

    // Per location
    for (const loc of LOCATIONS) {
      const group = generated.filter((r) => r.location === loc);
      if (group.length > 0) computeForGroup(group, 'location', loc);
    }

    // Per tenure
    for (const ten of TENURES) {
      const group = generated.filter((r) => r.tenure === ten);
      if (group.length > 0) computeForGroup(group, 'tenure', ten);
    }

    // Insert in batches (Supabase has row limits)
    const BATCH_SIZE = 100;
    for (let i = 0; i < scoreRows.length; i += BATCH_SIZE) {
      const batch = scoreRows.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from('scores').upsert(batch, {
        onConflict: 'survey_id,dimension_id,segment_type,segment_value',
      });
      if (error) {
        console.error(`  scores batch for ${scenario.code} FAILED: ${error.message}`);
      }
    }

    console.log(`  ${scenario.code}: ${scoreRows.length} score rows`);
  }
}

async function seedScenarioRecommendations(
  dimMap: Record<string, string>,
): Promise<void> {
  console.log('Creating scenario recommendations...');

  for (const scenario of SCENARIOS) {
    const sIdx = parseInt(scenario.id);
    const surveyId = scenarioUuid(sIdx, 'survey');

    // Delete existing recommendations for this survey
    await supabase.from('recommendations').delete().eq('survey_id', surveyId);

    const rows = scenario.recommendations.map((r) => ({
      survey_id: surveyId,
      dimension_id: dimMap[r.dimCode] ?? null,
      severity: r.severity,
      priority: r.priority,
      title: r.title,
      body: r.body,
      actions: r.actions,
      trust_ladder_link: r.trustLadderLink ?? null,
      ccc_service_link: r.cccServiceLink ?? null,
    }));

    const { error } = await supabase.from('recommendations').insert(rows);
    if (error) {
      console.error(`  recommendations for ${scenario.code} FAILED: ${error.message}`);
    } else {
      console.log(`  ${scenario.code}: ${rows.length} recommendations`);
    }
  }
}

async function seedScenarioKeywords(
  dimMap: Record<string, string>,
): Promise<void> {
  console.log('Creating scenario dialogue keywords...');

  for (const scenario of SCENARIOS) {
    const sIdx = parseInt(scenario.id);
    const surveyId = scenarioUuid(sIdx, 'survey');

    // Delete existing keywords for this survey
    await supabase.from('dialogue_keywords').delete().eq('survey_id', surveyId);

    const rows = scenario.keywords.map((k) => ({
      survey_id: surveyId,
      dimension_id: k.dimCode ? (dimMap[k.dimCode] ?? null) : null,
      keyword: k.keyword,
      frequency: k.frequency,
      sentiment: k.sentiment,
    }));

    const { error } = await supabase.from('dialogue_keywords').insert(rows);
    if (error) {
      console.error(`  keywords for ${scenario.code} FAILED: ${error.message}`);
    } else {
      console.log(`  ${scenario.code}: ${rows.length} keywords`);
    }
  }
}

// ---------------------------------------------------------------------------
// Clean
// ---------------------------------------------------------------------------

async function clean(): Promise<void> {
  console.log('Tearing down scenario data...\n');

  for (const scenario of SCENARIOS) {
    const sIdx = parseInt(scenario.id);
    const surveyId = scenarioUuid(sIdx, 'survey');
    const deploymentId = scenarioUuid(sIdx, 'deployment');
    const orgId = scenarioUuid(sIdx, 'org');

    console.log(`  cleaning ${scenario.code}...`);

    // Delete dialogue keywords
    await supabase.from('dialogue_keywords').delete().eq('survey_id', surveyId);

    // Delete recommendations
    await supabase.from('recommendations').delete().eq('survey_id', surveyId);

    // Delete scores
    await supabase.from('scores').delete().eq('survey_id', surveyId);

    // Delete responses (cascade deletes answers)
    await supabase.from('responses').delete().eq('deployment_id', deploymentId);

    // Delete question_dimensions for all 57 questions
    for (let q = 1; q <= 57; q++) {
      const qId = scenarioUuid(sIdx, 'question', q);
      await supabase.from('question_dimensions').delete().eq('question_id', qId);
    }

    // Delete questions
    await supabase.from('questions').delete().eq('survey_id', surveyId);

    // Delete deployment
    await supabase.from('deployments').delete().eq('id', deploymentId);

    // Delete survey
    await supabase.from('surveys').delete().eq('id', surveyId);

    // Delete organization
    await supabase.from('organizations').delete().eq('id', orgId);
  }

  console.log('\nScenario teardown complete.');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const isClean = process.argv.includes('--clean');

  if (isClean) {
    await clean();
    return;
  }

  console.log(`\nSeeding scenarios into ${SUPABASE_URL}\n`);

  const dimMap = await lookupDimensions();
  console.log(`  Found ${Object.keys(dimMap).length} dimensions\n`);

  await seedScenarioOrgs();
  await seedScenarioSurveys();
  await seedScenarioQuestions(dimMap);
  await seedScenarioDeployments();
  const allResponses = await seedScenarioResponses();
  await seedScenarioScores(dimMap, allResponses);
  await seedScenarioRecommendations(dimMap);
  await seedScenarioKeywords(dimMap);

  console.log('\n--- Scenario seed complete ---\n');
  console.log('Scenario surveys:');
  for (const s of SCENARIOS) {
    const surveyId = scenarioUuid(parseInt(s.id), 'survey');
    console.log(`  ${s.code.padEnd(22)} ${s.orgName.padEnd(28)} survey: ${surveyId}`);
  }
  console.log('');
}

main().catch((err) => {
  console.error('Scenario seed failed:', err);
  process.exit(1);
});
