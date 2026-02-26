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
  questions: {
    c1: '00000000-0000-0000-0000-000000001001',
    c2: '00000000-0000-0000-0000-000000001002',
    l1: '00000000-0000-0000-0000-000000001003',
    l2: '00000000-0000-0000-0000-000000001004',
    n1: '00000000-0000-0000-0000-000000001005',
    n2: '00000000-0000-0000-0000-000000001006',
    b1: '00000000-0000-0000-0000-000000001007',
    b2: '00000000-0000-0000-0000-000000001008',
    oe1: '00000000-0000-0000-0000-000000001009',
  },
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

async function seedQuestions(): Promise<void> {
  console.log('Creating questions...');

  const questions = [
    { id: IDS.questions.c1, text: 'I understand why this organization exists and what it stands for.', order: 1, dim: 'core' },
    { id: IDS.questions.c2, text: 'People feel comfortable admitting mistakes or uncertainties.', order: 2, dim: 'core' },
    { id: IDS.questions.l1, text: "I know what's expected of me in my role.", order: 3, dim: 'clarity' },
    { id: IDS.questions.l2, text: 'Priorities often change without clear explanation.', order: 4, dim: 'clarity', reverse: true },
    { id: IDS.questions.n1, text: 'I feel comfortable sharing honest feedback with my team.', order: 5, dim: 'connection' },
    { id: IDS.questions.n2, text: 'People across teams genuinely support each other.', order: 6, dim: 'connection' },
    { id: IDS.questions.b1, text: 'Teams across the organization collaborate effectively.', order: 7, dim: 'collaboration' },
    { id: IDS.questions.b2, text: 'When conflicts arise, they are addressed constructively.', order: 8, dim: 'collaboration' },
    { id: IDS.questions.oe1, text: 'What is one thing you would change about how your organization communicates?', order: 9, dim: null },
  ];

  // Upsert questions
  const { error: qError } = await supabase.from('questions').upsert(
    questions.map((q) => ({
      id: q.id,
      survey_id: IDS.survey,
      text: q.text,
      type: q.dim ? 'likert_4' : 'open_text',
      order_index: q.order,
      reverse_scored: q.reverse ?? false,
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

  // Delete existing mappings then re-insert
  const likertQuestions = questions.filter((q) => q.dim);
  for (const q of likertQuestions) {
    await supabase.from('question_dimensions').delete().eq('question_id', q.id);
  }

  const { error: qdError } = await supabase.from('question_dimensions').insert(
    likertQuestions.map((q) => ({
      question_id: q.id,
      dimension_id: dimMap[q.dim!],
      weight: 1.0,
    })),
  );

  if (qdError) {
    console.error(`  question_dimensions FAILED: ${qdError.message}`);
  } else {
    console.log(`  ${questions.length} questions, ${likertQuestions.length} dimension mappings`);
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

  const likertQuestionIds = Object.values(IDS.questions).filter((id) => id !== IDS.questions.oe1);
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

    // Generate answers with some variance (scores cluster 2-4, skewing positive)
    const answers = likertQuestionIds.map((qId) => ({
      response_id: response.id,
      question_id: qId,
      likert_value: Math.min(4, Math.max(1, Math.floor(Math.random() * 3) + 2)),
    }));

    // Add open-ended answer
    answers.push({
      response_id: response.id,
      question_id: IDS.questions.oe1,
      likert_value: null as unknown as number,
    });

    const { error: aErr } = await supabase.from('answers').insert(
      answers.map((a) => ({
        ...a,
        open_text_value: a.question_id === IDS.questions.oe1
          ? openEndedTexts[i % openEndedTexts.length]
          : null,
        likert_value: a.question_id === IDS.questions.oe1 ? null : a.likert_value,
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
  for (const qId of Object.values(IDS.questions)) {
    await supabase.from('question_dimensions').delete().eq('question_id', qId);
  }
  await supabase.from('questions').delete().eq('survey_id', IDS.survey);

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
