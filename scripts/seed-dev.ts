/**
 * Development seed script for Supabase Cloud.
 *
 * Creates test users, organizations, a sample survey with questions,
 * a deployment, and synthetic responses. Designed to be run repeatedly —
 * uses deterministic IDs so re-running overwrites rather than duplicates.
 *
 * Usage:
 *   bun run scripts/seed-dev.ts          # seed
 *   bun run scripts/seed-dev.ts --clean  # tear down seeded data
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 * (service role key — NOT the publishable/anon key).
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
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local\n' +
    'Add: SUPABASE_SERVICE_ROLE_KEY=<your service role key from Supabase dashboard>',
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------------------------------------------------------------------------
// Deterministic IDs
// ---------------------------------------------------------------------------

const IDS = {
  org: {
    ccc: '00000000-0000-0000-0000-000000000001',
    client: '00000000-0000-0000-0000-000000000002',
  },
  template: '00000000-0000-0000-0000-000000000010',
  survey: '00000000-0000-0000-0000-000000000100',
  deployment: '00000000-0000-0000-0000-000000000200',
  /** Q1-Q56 Likert + Q57 open-ended. UUID format: 00000000-0000-0000-0000-1000000000NN */
  questions: Object.fromEntries([
    ...Array.from({ length: 57 }, (_, i) => [
      `q${i + 1}`,
      `00000000-0000-0000-0000-1000000000${String(i + 1).padStart(2, '0')}`,
    ]),
  ]) as Record<string, string>,
} as const;

// Test user passwords (all the same for dev convenience)
const TEST_PASSWORD = 'TestPass123!';

const TEST_USERS = [
  {
    email: 'admin@collectivecommunication.ca',
    name: 'Amanda Bates',
    role: 'ccc_admin' as const,
    orgId: IDS.org.ccc,
  },
  {
    email: 'member@collectivecommunication.ca',
    name: 'Amy Myer',
    role: 'ccc_member' as const,
    orgId: IDS.org.ccc,
  },
  {
    email: 'exec@rivervalleyhealth.ca',
    name: 'Jordan Chen',
    role: 'client_exec' as const,
    orgId: IDS.org.client,
  },
  {
    email: 'director@rivervalleyhealth.ca',
    name: 'Priya Sharma',
    role: 'client_director' as const,
    orgId: IDS.org.client,
    department: 'Nursing',
  },
  {
    email: 'manager@rivervalleyhealth.ca',
    name: 'Marcus Williams',
    role: 'client_manager' as const,
    orgId: IDS.org.client,
    department: 'Emergency',
    team: 'Triage',
  },
];

// ---------------------------------------------------------------------------
// Seed functions
// ---------------------------------------------------------------------------

async function seedUsers(): Promise<Map<string, string>> {
  console.log('Creating test users...');
  const emailToId = new Map<string, string>();

  for (const user of TEST_USERS) {
    // Check if user already exists
    const { data: existing } = await supabase.auth.admin.listUsers();
    const found = existing?.users?.find((u) => u.email === user.email);

    if (found) {
      console.log(`  exists: ${user.email} (${found.id})`);
      emailToId.set(user.email, found.id);
      continue;
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: user.name },
    });

    if (error) {
      console.error(`  FAILED: ${user.email} — ${error.message}`);
      continue;
    }

    console.log(`  created: ${user.email} (${data.user.id})`);
    emailToId.set(user.email, data.user.id);
  }

  return emailToId;
}

async function seedOrganizations(): Promise<void> {
  console.log('Creating organizations...');

  await supabase.from('organizations').upsert([
    {
      id: IDS.org.ccc,
      name: 'COLLECTIVE culture + communication',
      slug: 'ccc',
      settings: { timezone: 'America/Toronto', anonymityThreshold: 5 },
    },
    {
      id: IDS.org.client,
      name: 'River Valley Health',
      slug: 'river-valley-health',
      settings: {
        timezone: 'America/Toronto',
        anonymityThreshold: 5,
        metadata: {
          departments: ['Nursing', 'Administration', 'Emergency', 'Surgery', 'Outpatient'],
          roles: ['Director', 'Manager', 'Supervisor', 'Staff'],
          locations: ['Main Campus', 'West Wing', 'East Annex'],
          tenureBands: ['< 1 year', '1-3 years', '3-5 years', '5-10 years', '10+ years'],
        },
      },
    },
  ], { onConflict: 'id' });

  console.log('  done');
}

async function seedOrgMembers(emailToId: Map<string, string>): Promise<void> {
  console.log('Creating org memberships...');

  const members = TEST_USERS
    .filter((u) => emailToId.has(u.email))
    .map((u) => ({
      organization_id: u.orgId,
      user_id: emailToId.get(u.email)!,
      role: u.role,
      department: u.department ?? null,
      team: u.team ?? null,
    }));

  const { error } = await supabase.from('org_members').upsert(members, {
    onConflict: 'organization_id,user_id',
  });

  if (error) {
    console.error(`  FAILED: ${error.message}`);
  } else {
    console.log(`  ${members.length} memberships`);
  }
}

async function seedSurvey(): Promise<void> {
  console.log('Creating survey template + survey...');

  await supabase.from('survey_templates').upsert([{
    id: IDS.template,
    name: 'Culture Compass Assessment',
    description: 'The standard CC+C culture assessment survey with 4 dimensions.',
    is_system: true,
  }], { onConflict: 'id' });

  await supabase.from('surveys').upsert([{
    id: IDS.survey,
    organization_id: IDS.org.client,
    template_id: IDS.template,
    title: 'Q1 2026 Culture Assessment',
    status: 'active',
    opens_at: '2026-01-15T00:00:00Z',
    closes_at: '2026-03-31T23:59:59Z',
  }], { onConflict: 'id' });

  console.log('  done');
}

// Sub-dimension UUIDs — shared between seedSubDimensions and seedQuestions
const SUB = {
  // Core
  psychological_safety: '00000000-0000-0000-0000-000000002001',
  trust: '00000000-0000-0000-0000-000000002002',
  fairness_integrity: '00000000-0000-0000-0000-000000002003',
  purpose_meaning: '00000000-0000-0000-0000-000000002004',
  leader_behaviour: '00000000-0000-0000-0000-000000002005',
  // Clarity
  decision_making: '00000000-0000-0000-0000-000000003001',
  role_clarity: '00000000-0000-0000-0000-000000003002',
  strategic_clarity: '00000000-0000-0000-0000-000000003003',
  empowerment: '00000000-0000-0000-0000-000000003004',
  goal_alignment: '00000000-0000-0000-0000-000000003005',
  // Connection
  belonging_inclusion: '00000000-0000-0000-0000-000000004001',
  employee_voice: '00000000-0000-0000-0000-000000004002',
  information_flow: '00000000-0000-0000-0000-000000004003',
  shared_identity: '00000000-0000-0000-0000-000000004004',
  involvement: '00000000-0000-0000-0000-000000004005',
  recognition: '00000000-0000-0000-0000-000000004006',
  // Collaboration
  sustainable_pace: '00000000-0000-0000-0000-000000005001',
  adaptability_learning: '00000000-0000-0000-0000-000000005002',
  cross_functional: '00000000-0000-0000-0000-000000005003',
  ways_of_working: '00000000-0000-0000-0000-000000005004',
  ownership_accountability: '00000000-0000-0000-0000-000000005005',
} as const;

async function seedSubDimensions(): Promise<void> {
  console.log('Creating sub-dimensions (21 total)...');

  // Look up dimension IDs by code
  const { data: dims } = await supabase.from('dimensions').select('id, code');
  if (!dims || dims.length === 0) {
    console.log('  FAILED: no dimensions found — run migrations first');
    return;
  }
  const dimId = Object.fromEntries(dims.map(d => [d.code, d.id]));

  const subDimensions = [
    // Core
    { id: SUB.psychological_safety, dimension_id: dimId.core, code: 'psychological_safety', name: 'Psychological Safety', description: 'Can people speak up, take risks, admit mistakes without fear?', display_order: 0 },
    { id: SUB.trust, dimension_id: dimId.core, code: 'trust', name: 'Trust', description: 'Do people trust colleagues and leadership to act in good faith?', display_order: 1 },
    { id: SUB.fairness_integrity, dimension_id: dimId.core, code: 'fairness_integrity', name: 'Fairness & Integrity', description: 'Are decisions and treatment fair? Do stated values match reality?', display_order: 2 },
    { id: SUB.purpose_meaning, dimension_id: dimId.core, code: 'purpose_meaning', name: 'Purpose & Meaning', description: 'Is there emotional connection to the work and organization\'s mission?', display_order: 3 },
    { id: SUB.leader_behaviour, dimension_id: dimId.core, code: 'leader_behaviour', name: 'Leader Behaviour', description: 'Do leaders\' words and actions align?', display_order: 4 },
    // Clarity
    { id: SUB.decision_making, dimension_id: dimId.clarity, code: 'decision_making', name: 'Decision Making', description: 'Are decision rights clear? Is the process transparent?', display_order: 0 },
    { id: SUB.role_clarity, dimension_id: dimId.clarity, code: 'role_clarity', name: 'Role Clarity', description: 'Do people know who owns what?', display_order: 1 },
    { id: SUB.strategic_clarity, dimension_id: dimId.clarity, code: 'strategic_clarity', name: 'Strategic Clarity', description: 'Do people know the mission, priorities, and what matters most?', display_order: 2 },
    { id: SUB.empowerment, dimension_id: dimId.clarity, code: 'empowerment', name: 'Empowerment', description: 'Do people have resources, skills, and autonomy to be effective?', display_order: 3 },
    { id: SUB.goal_alignment, dimension_id: dimId.clarity, code: 'goal_alignment', name: 'Goal Alignment', description: 'Can people connect their work to organizational outcomes?', display_order: 4 },
    // Connection
    { id: SUB.belonging_inclusion, dimension_id: dimId.connection, code: 'belonging_inclusion', name: 'Belonging & Inclusion', description: 'Do people feel truly accepted and part of something?', display_order: 0 },
    { id: SUB.employee_voice, dimension_id: dimId.connection, code: 'employee_voice', name: 'Employee Voice', description: 'Can people share concerns, ideas, and dissent?', display_order: 1 },
    { id: SUB.information_flow, dimension_id: dimId.connection, code: 'information_flow', name: 'Information Flow', description: 'Does information flow freely? Is communication clear and two-way?', display_order: 2 },
    { id: SUB.shared_identity, dimension_id: dimId.connection, code: 'shared_identity', name: 'Shared Identity', description: 'Is there a sense of \'us\' across teams and levels?', display_order: 3 },
    { id: SUB.involvement, dimension_id: dimId.connection, code: 'involvement', name: 'Involvement', description: 'Are people included in decisions that affect their work?', display_order: 4 },
    { id: SUB.recognition, dimension_id: dimId.connection, code: 'recognition', name: 'Recognition', description: 'Do people feel seen and valued?', display_order: 5 },
    // Collaboration
    { id: SUB.sustainable_pace, dimension_id: dimId.collaboration, code: 'sustainable_pace', name: 'Sustainable Pace', description: 'Can people sustain their workload? Boundaries respected?', display_order: 0 },
    { id: SUB.adaptability_learning, dimension_id: dimId.collaboration, code: 'adaptability_learning', name: 'Adaptability & Learning', description: 'Does the org learn from mistakes? Continuous improvement?', display_order: 1 },
    { id: SUB.cross_functional, dimension_id: dimId.collaboration, code: 'cross_functional', name: 'Cross-Functional Coordination', description: 'Does work flow smoothly across teams and functions?', display_order: 2 },
    { id: SUB.ways_of_working, dimension_id: dimId.collaboration, code: 'ways_of_working', name: 'Ways of Working', description: 'Meetings productive? Handoffs smooth?', display_order: 3 },
    { id: SUB.ownership_accountability, dimension_id: dimId.collaboration, code: 'ownership_accountability', name: 'Ownership & Accountability', description: 'Is there clear ownership and follow-through on commitments?', display_order: 4 },
  ];

  const { error } = await supabase.from('sub_dimensions').upsert(subDimensions, { onConflict: 'id' });
  if (error) {
    console.log(`  sub-dimensions FAILED: ${error.message}`);
  } else {
    console.log(`  ${subDimensions.length} sub-dimensions`);
  }
}

async function seedQuestions(): Promise<void> {
  console.log('Creating questions (56 Likert + 1 open-ended)...');

  type QuestionDef = {
    id: string;
    text: string;
    order: number;
    dim: string | null;
    subDim: string | null;
    reverse?: boolean;
    type?: 'likert' | 'open_text';
  };

  const questions: QuestionDef[] = [
    // CORE — Psychological Safety (Q1-Q2)
    { id: IDS.questions.q1, text: 'I feel comfortable admitting mistakes or uncertainties.', order: 1, dim: 'core', subDim: SUB.psychological_safety },
    { id: IDS.questions.q2, text: 'It\'s safe to bring up problems or tough issues on my team.', order: 2, dim: 'core', subDim: SUB.psychological_safety },
    // CORE — Trust (Q3-Q5)
    { id: IDS.questions.q3, text: 'I assume my colleagues have positive intentions, even during disagreements.', order: 3, dim: 'core', subDim: SUB.trust },
    { id: IDS.questions.q4, text: 'I trust that my leaders will follow through on their commitments.', order: 4, dim: 'core', subDim: SUB.trust },
    { id: IDS.questions.q5, text: 'I trust the information I receive from my leaders.', order: 5, dim: 'core', subDim: SUB.trust },
    // CORE — Fairness & Integrity (Q6-Q8)
    { id: IDS.questions.q6, text: 'Our purpose and values are evident in everyday actions.', order: 6, dim: 'core', subDim: SUB.fairness_integrity },
    { id: IDS.questions.q7, text: 'Decisions that affect people in our organization are made fairly and consistently.', order: 7, dim: 'core', subDim: SUB.fairness_integrity },
    { id: IDS.questions.q8, text: 'People are held to the same standards, regardless of their position or who they are.', order: 8, dim: 'core', subDim: SUB.fairness_integrity },
    // CORE — Purpose & Meaning (Q9-Q11)
    { id: IDS.questions.q9, text: 'I understand why this organization exists and what it stands for.', order: 9, dim: 'core', subDim: SUB.purpose_meaning },
    { id: IDS.questions.q10, text: 'The work I do here gives me a sense of personal meaning.', order: 10, dim: 'core', subDim: SUB.purpose_meaning },
    { id: IDS.questions.q11, text: 'Working here feels consistent with what I stand for personally.', order: 11, dim: 'core', subDim: SUB.purpose_meaning },
    // CORE — Leader Behaviour (Q12-Q13)
    { id: IDS.questions.q12, text: 'Leaders\' actions align with what they say.', order: 12, dim: 'core', subDim: SUB.leader_behaviour },
    { id: IDS.questions.q13, text: 'I often receive mixed messages from different leaders.', order: 13, dim: 'core', subDim: SUB.leader_behaviour, reverse: true },
    // CLARITY — Decision Making (Q14-Q17)
    { id: IDS.questions.q14, text: 'Priorities often change without clear explanation.', order: 14, dim: 'clarity', subDim: SUB.decision_making, reverse: true },
    { id: IDS.questions.q15, text: 'The reasons behind major decisions are communicated.', order: 15, dim: 'clarity', subDim: SUB.decision_making },
    { id: IDS.questions.q16, text: 'I don\'t know what decisions I am allowed to make.', order: 16, dim: 'clarity', subDim: SUB.decision_making, reverse: true },
    { id: IDS.questions.q17, text: 'When expectations change, I understand why.', order: 17, dim: 'clarity', subDim: SUB.decision_making },
    // CLARITY — Role Clarity (Q18-Q20)
    { id: IDS.questions.q18, text: 'I know what\'s expected of me in my role.', order: 18, dim: 'clarity', subDim: SUB.role_clarity },
    { id: IDS.questions.q19, text: 'It\'s clear who is responsible for what on my team.', order: 19, dim: 'clarity', subDim: SUB.role_clarity },
    { id: IDS.questions.q20, text: 'I often do work that I\'m not sure if I should be doing because responsibilities aren\'t clear.', order: 20, dim: 'clarity', subDim: SUB.role_clarity, reverse: true },
    // CLARITY — Strategic Clarity (Q21-Q22)
    { id: IDS.questions.q21, text: 'I often feel unsure about where the organization is heading.', order: 21, dim: 'clarity', subDim: SUB.strategic_clarity, reverse: true },
    { id: IDS.questions.q22, text: 'I understand how my team\'s work connects to organizational priorities.', order: 22, dim: 'clarity', subDim: SUB.strategic_clarity },
    // CLARITY — Empowerment (Q23-Q24)
    { id: IDS.questions.q23, text: 'Our tools and technology make collaboration simple and efficient.', order: 23, dim: 'clarity', subDim: SUB.empowerment },
    { id: IDS.questions.q24, text: 'I know where to find what I need without asking multiple people.', order: 24, dim: 'clarity', subDim: SUB.empowerment },
    // CLARITY — Goal Alignment (Q25-Q27)
    { id: IDS.questions.q25, text: 'I can see how my work contributes to something meaningful.', order: 25, dim: 'clarity', subDim: SUB.goal_alignment },
    { id: IDS.questions.q26, text: 'My team\'s goals clearly support the organization\'s top priorities.', order: 26, dim: 'clarity', subDim: SUB.goal_alignment },
    { id: IDS.questions.q27, text: 'I sometimes work on things that don\'t seem connected to any larger goal.', order: 27, dim: 'clarity', subDim: SUB.goal_alignment, reverse: true },
    // CONNECTION — Belonging & Inclusion (Q28-Q31)
    { id: IDS.questions.q28, text: 'I feel seen and included, regardless of my role.', order: 28, dim: 'connection', subDim: SUB.belonging_inclusion },
    { id: IDS.questions.q29, text: 'I have fun at work.', order: 29, dim: 'connection', subDim: SUB.belonging_inclusion },
    { id: IDS.questions.q30, text: 'I feel lonely at work.', order: 30, dim: 'connection', subDim: SUB.belonging_inclusion, reverse: true },
    { id: IDS.questions.q31, text: 'I feel a genuine sense of belonging here.', order: 31, dim: 'connection', subDim: SUB.belonging_inclusion },
    // CONNECTION — Employee Voice (Q32-Q34)
    { id: IDS.questions.q32, text: 'I can express a different point of view without negative consequences.', order: 32, dim: 'connection', subDim: SUB.employee_voice },
    { id: IDS.questions.q33, text: 'When I speak up, my input genuinely influences decisions.', order: 33, dim: 'connection', subDim: SUB.employee_voice },
    { id: IDS.questions.q34, text: 'Feedback here often goes into a black hole.', order: 34, dim: 'connection', subDim: SUB.employee_voice, reverse: true },
    // CONNECTION — Information Flow (Q35-Q37)
    { id: IDS.questions.q35, text: 'Communication between all levels of the organization feels open.', order: 35, dim: 'connection', subDim: SUB.information_flow },
    { id: IDS.questions.q36, text: 'Important information reaches me in time for me to act on it.', order: 36, dim: 'connection', subDim: SUB.information_flow },
    { id: IDS.questions.q37, text: 'Information flows well between teams, not just within them.', order: 37, dim: 'connection', subDim: SUB.information_flow },
    // CONNECTION — Shared Identity (Q38-Q39)
    { id: IDS.questions.q38, text: 'Team members look out for each other.', order: 38, dim: 'connection', subDim: SUB.shared_identity },
    { id: IDS.questions.q39, text: 'There is a strong sense of \'we\'re all in this together\' across the organization.', order: 39, dim: 'connection', subDim: SUB.shared_identity },
    // CONNECTION — Involvement (Q40-Q41)
    { id: IDS.questions.q40, text: 'I have a say in decisions that affect my day-to-day work.', order: 40, dim: 'connection', subDim: SUB.involvement },
    { id: IDS.questions.q41, text: 'People closest to the work are included in decisions about it.', order: 41, dim: 'connection', subDim: SUB.involvement },
    // CONNECTION — Recognition (Q42-Q43)
    { id: IDS.questions.q42, text: 'I feel recognized for the contributions that matter most.', order: 42, dim: 'connection', subDim: SUB.recognition },
    { id: IDS.questions.q43, text: 'Recognition here often feels like a box-ticking exercise rather than genuine appreciation.', order: 43, dim: 'connection', subDim: SUB.recognition, reverse: true },
    // COLLABORATION — Sustainable Pace (Q44-Q45)
    { id: IDS.questions.q44, text: 'We have the right balance between collaboration time and focus time.', order: 44, dim: 'collaboration', subDim: SUB.sustainable_pace },
    { id: IDS.questions.q45, text: 'The pace of work here is sustainable over the long term.', order: 45, dim: 'collaboration', subDim: SUB.sustainable_pace },
    // COLLABORATION — Adaptability & Learning (Q46-Q47)
    { id: IDS.questions.q46, text: 'When something goes wrong, blame is a common first reaction.', order: 46, dim: 'collaboration', subDim: SUB.adaptability_learning, reverse: true },
    { id: IDS.questions.q47, text: 'Our team regularly reflects on what\'s working and what isn\'t, and adjusts.', order: 47, dim: 'collaboration', subDim: SUB.adaptability_learning },
    // COLLABORATION — Cross-Functional Coordination (Q48-Q50)
    { id: IDS.questions.q48, text: 'It\'s easy to access the people or information I need to do my job.', order: 48, dim: 'collaboration', subDim: SUB.cross_functional },
    { id: IDS.questions.q49, text: 'There are silos in our organization.', order: 49, dim: 'collaboration', subDim: SUB.cross_functional, reverse: true },
    { id: IDS.questions.q50, text: 'I have opportunities to co-create and problem-solve across functions.', order: 50, dim: 'collaboration', subDim: SUB.cross_functional },
    // COLLABORATION — Ways of Working (Q51-Q52)
    { id: IDS.questions.q51, text: 'We have the right balance between meetings and focus time.', order: 51, dim: 'collaboration', subDim: SUB.ways_of_working },
    { id: IDS.questions.q52, text: 'We have clear processes for how we get work done.', order: 52, dim: 'collaboration', subDim: SUB.ways_of_working },
    // COLLABORATION — Ownership & Accountability (Q53-Q55)
    { id: IDS.questions.q53, text: 'People here follow through on their commitments.', order: 53, dim: 'collaboration', subDim: SUB.ownership_accountability },
    { id: IDS.questions.q54, text: 'I understand what is expected of me.', order: 54, dim: 'collaboration', subDim: SUB.ownership_accountability },
    { id: IDS.questions.q55, text: 'Things fall through the cracks because nobody clearly owns them.', order: 55, dim: 'collaboration', subDim: SUB.ownership_accountability, reverse: true },
    // SYSTEM HEALTH — S4 (Q56, no sub-dimension, maps to all 4 dimensions)
    { id: IDS.questions.q56, text: 'I am proud to be a team member at this organization.', order: 56, dim: null, subDim: null },
    // Open-ended (Q57)
    { id: IDS.questions.q57, text: 'What is one thing you would change about how your organization communicates?', order: 57, dim: null, subDim: null, type: 'open_text' },
  ];

  // Upsert questions
  const { error: qError } = await supabase.from('questions').upsert(
    questions.map((q) => ({
      id: q.id,
      survey_id: IDS.survey,
      text: q.text,
      type: q.type ?? 'likert',
      order_index: q.order,
      reverse_scored: q.reverse ?? false,
      sub_dimension_id: q.subDim ?? null,
    })),
    { onConflict: 'id' },
  );

  if (qError) {
    console.error(`  questions FAILED: ${qError.message}`);
    return;
  }

  // Get dimension IDs
  const { data: dims } = await supabase.from('dimensions').select('id, code');
  if (!dims) return;
  const dimMap = Object.fromEntries(dims.map((d) => [d.code, d.id]));

  // Build dimension mappings
  const likertQuestions = questions.filter((q) => q.dim);
  const s4Question = questions.find((q) => q.order === 56);

  // Delete existing mappings then re-insert
  for (const q of questions) {
    await supabase.from('question_dimensions').delete().eq('question_id', q.id);
  }

  // Standard 1:1 dimension mappings
  const dimensionMappings = likertQuestions.map((q) => ({
    question_id: q.id,
    dimension_id: dimMap[q.dim!],
    weight: 1.0,
  }));

  // S4 maps to all 4 dimensions with weight 0.25
  if (s4Question) {
    for (const code of ['core', 'clarity', 'connection', 'collaboration']) {
      dimensionMappings.push({
        question_id: s4Question.id,
        dimension_id: dimMap[code],
        weight: 0.25,
      });
    }
  }

  const { error: qdError } = await supabase.from('question_dimensions').insert(dimensionMappings);

  if (qdError) {
    console.error(`  question_dimensions FAILED: ${qdError.message}`);
  } else {
    console.log(`  ${questions.length} questions, ${dimensionMappings.length} dimension mappings`);
  }
}

async function seedDeployment(): Promise<void> {
  console.log('Creating deployment...');

  const { error } = await supabase.from('deployments').upsert([{
    id: IDS.deployment,
    survey_id: IDS.survey,
    type: 'anonymous_link',
    is_active: true,
    opens_at: '2026-01-15T00:00:00Z',
    closes_at: '2026-03-31T23:59:59Z',
  }], { onConflict: 'id' });

  if (error) {
    console.error(`  FAILED: ${error.message}`);
  } else {
    // Fetch the generated token to display the survey URL
    const { data } = await supabase.from('deployments').select('token').eq('id', IDS.deployment).single();
    console.log(`  done — survey link: ${SUPABASE_URL?.replace('.supabase.co', '')}/survey/${data?.token}`);
  }
}

async function seedResponses(): Promise<void> {
  console.log('Creating synthetic responses...');

  const departments = ['Nursing', 'Administration', 'Emergency', 'Surgery', 'Outpatient'];
  const roles = ['Director', 'Manager', 'Supervisor', 'Staff'];
  const locations = ['Main Campus', 'West Wing', 'East Annex'];
  const tenures = ['< 1 year', '1-3 years', '3-5 years', '5-10 years', '10+ years'];

  const openEndedTexts = [
    'More transparency from SLT about strategic decisions.',
    'Less email, more face-to-face conversations.',
    'Regular town halls that actually address concerns.',
    'Better cross-department communication channels.',
    'Leadership should listen more and talk less.',
    'Reduce the number of meetings that could be emails.',
    'Clearer communication about organizational changes.',
    'More recognition of team contributions.',
    'Fewer last-minute priority changes.',
    'Create safe spaces for honest dialogue.',
    'Improve onboarding communication for new staff.',
    'More consistency between what is said and what is done.',
  ];

  // All Likert questions: Q1-Q56 (exclude Q57 open-ended)
  const likertQuestionIds = Object.entries(IDS.questions)
    .filter(([key]) => key !== 'q57')
    .map(([, id]) => id);
  const responseCount = 24; // Above anonymity threshold for all segments

  // Delete existing responses for this deployment first
  await supabase.from('responses').delete().eq('deployment_id', IDS.deployment);

  for (let i = 0; i < responseCount; i++) {
    // Create response
    const { data: response, error: rErr } = await supabase.from('responses').insert({
      deployment_id: IDS.deployment,
      session_token: `seed-session-${i.toString().padStart(3, '0')}`,
      metadata_department: departments[i % departments.length],
      metadata_role: roles[i % roles.length],
      metadata_location: locations[i % locations.length],
      metadata_tenure: tenures[i % tenures.length],
      submitted_at: new Date(Date.now() - (responseCount - i) * 3600000).toISOString(),
      is_complete: true,
    }).select('id').single();

    if (rErr || !response) {
      console.error(`  response ${i} FAILED: ${rErr?.message}`);
      continue;
    }

    // Generate answers with some variance (scores cluster 2-5 on 1-5 scale, skewing positive)
    const answers = likertQuestionIds.map((qId) => ({
      response_id: response.id,
      question_id: qId,
      likert_value: Math.min(5, Math.max(1, Math.floor(Math.random() * 4) + 2)),
    }));

    // Add open-ended answer
    answers.push({
      response_id: response.id,
      question_id: IDS.questions.q57,
      likert_value: null as unknown as number,
    });

    const { error: aErr } = await supabase.from('answers').insert(
      answers.map((a) => ({
        ...a,
        open_text_value: a.question_id === IDS.questions.q57
          ? openEndedTexts[i % openEndedTexts.length]
          : null,
        likert_value: a.question_id === IDS.questions.q57 ? null : a.likert_value,
      })),
    );

    if (aErr) {
      console.error(`  answers for response ${i} FAILED: ${aErr.message}`);
    }
  }

  console.log(`  ${responseCount} responses with answers`);
}

// ---------------------------------------------------------------------------
// Clean
// ---------------------------------------------------------------------------

async function clean(): Promise<void> {
  console.log('Tearing down seed data...');

  // Delete responses/answers (cascade from deployment)
  console.log('  deleting responses...');
  await supabase.from('responses').delete().eq('deployment_id', IDS.deployment);

  // Delete deployment
  console.log('  deleting deployment...');
  await supabase.from('deployments').delete().eq('id', IDS.deployment);

  // Delete question_dimensions + questions
  console.log('  deleting questions...');
  const allQuestionIds = Object.values(IDS.questions);
  for (const qId of allQuestionIds) {
    await supabase.from('question_dimensions').delete().eq('question_id', qId);
  }
  await supabase.from('questions').delete().eq('survey_id', IDS.survey);

  // Delete sub-dimensions
  console.log('  deleting sub-dimensions...');
  const allSubDimIds = Object.values(SUB);
  await supabase.from('sub_dimensions').delete().in('id', allSubDimIds);

  // Delete survey
  console.log('  deleting survey...');
  await supabase.from('surveys').delete().eq('id', IDS.survey);

  // Delete template
  console.log('  deleting template...');
  await supabase.from('survey_templates').delete().eq('id', IDS.template);

  // Delete org members + orgs
  console.log('  deleting org memberships...');
  await supabase.from('org_members').delete().eq('organization_id', IDS.org.ccc);
  await supabase.from('org_members').delete().eq('organization_id', IDS.org.client);

  console.log('  deleting organizations...');
  await supabase.from('organizations').delete().eq('id', IDS.org.ccc);
  await supabase.from('organizations').delete().eq('id', IDS.org.client);

  // Delete auth users
  console.log('  deleting auth users...');
  for (const user of TEST_USERS) {
    const { data: existing } = await supabase.auth.admin.listUsers();
    const found = existing?.users?.find((u) => u.email === user.email);
    if (found) {
      await supabase.auth.admin.deleteUser(found.id);
      console.log(`    deleted: ${user.email}`);
    }
  }

  console.log('Teardown complete.');
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

  console.log(`\nSeeding ${SUPABASE_URL}\n`);

  await seedOrganizations();
  const emailToId = await seedUsers();
  await seedOrgMembers(emailToId);
  await seedSurvey();
  await seedSubDimensions();
  await seedQuestions();
  await seedDeployment();
  await seedResponses();

  console.log('\n--- Seed complete ---');
  console.log('\nTest accounts (all use password: TestPass123!):');
  for (const user of TEST_USERS) {
    console.log(`  ${user.role.padEnd(18)} ${user.email}`);
  }
  console.log('');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
