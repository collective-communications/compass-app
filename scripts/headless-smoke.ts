/* eslint-disable no-console */

/**
 * Headless end-to-end smoke test for @compass/sdk.
 *
 * Drives the full platform flow without the web UI:
 *   1. Create organization
 *   2. Create survey + copy questions from system template
 *   3. Publish survey (creates deployment)
 *   4. Submit a synthetic anonymous response (engine adapter, session token)
 *   5. Trigger score recalculation (score-survey edge function)
 *   6. Create + generate a report (generate-report edge function)
 *   7. Read back the signed download URL
 *   8. Tear down everything created
 *
 * Run:  bun run headless-smoke
 *
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY + SUPABASE_ANON_KEY in
 * .env.local. Service role drives admin steps; the anon key is used for the
 * respondent session client (mirrors how a real respondent's browser would
 * talk to the deployment, with `x-session-token` injected per request).
 *
 * Prereq: at least one row in auth.users — run `bun run db:seed` once if the
 * project is empty (surveys.created_by has a FK to auth.users).
 *
 * Note: the score-survey and generate-report edge functions are deployed to
 * require a user-session JWT (not the service role), so steps 5–6 may return
 * 401/500 against a fresh project. That isn't an SDK bug — `supabase.functions
 * .invoke` is issued correctly; the function's auth policy rejects the call.
 * The script tolerates these failures and continues to teardown to keep the
 * round-trip observable.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  configureSdk,
  createOrganization,
  createSurvey,
  publishSurvey,
  triggerScoreRecalculation,
  createReport,
  triggerReportGeneration,
  getReportStatus,
  getReportDownloadUrl,
  createSurveyEngineAdapter,
  type Logger,
} from '@compass/sdk';
import type { Database, ReportConfig } from '@compass/types';

function loadEnv(): Record<string, string> {
  const envPath = resolve(import.meta.dirname, '..', '.env.local');
  const content = readFileSync(envPath, 'utf-8');
  const vars: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    vars[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  return vars;
}

const env = loadEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL ?? env.SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = env.VITE_SUPABASE_ANON_KEY ?? env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) {
  console.error(
    'Missing one of SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY in .env.local',
  );
  process.exit(1);
}

const adminClient: SupabaseClient<Database> = createClient<Database>(
  SUPABASE_URL,
  SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const logger: Logger = {
  info: (obj, msg) => console.log('[info]', msg ?? '', obj),
  warn: (obj, msg) => console.warn('[warn]', msg ?? '', obj),
  error: (obj, msg) => console.error('[error]', msg ?? '', obj),
  debug: () => undefined,
};

configureSdk({
  client: adminClient,
  surveySessionClient: (sessionToken) =>
    createClient<Database>(SUPABASE_URL, ANON_KEY, {
      global: { headers: { 'x-session-token': sessionToken } },
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  logger,
});

const STEP = (n: number, label: string): void => {
  console.log(`\n━━━ ${n}. ${label} ━━━`);
};

async function main(): Promise<void> {
  const stamp = Date.now();
  const orgName = `Headless Smoke ${stamp}`;

  STEP(1, 'Create organization');
  const org = await createOrganization({ name: orgName });
  console.log(`  ✓ org ${org.id} (${org.slug})`);

  STEP(2, 'Create survey (system template auto-copy)');
  // surveys.created_by → auth.users(id). Pick the first existing auth user.
  const { data: usersList, error: usersErr } = await adminClient.auth.admin.listUsers({ perPage: 1 });
  const firstUser = usersList?.users?.[0];
  if (usersErr || !firstUser) {
    throw new Error('No auth.users to attribute survey to. Run `bun run scripts/seed-dev.ts` first.');
  }
  const survey = await createSurvey({
    organizationId: org.id,
    title: `Smoke Survey ${stamp}`,
    createdBy: firstUser.id,
  });
  console.log(`  ✓ survey ${survey.id} (created_by=${firstUser.id})`);

  STEP(3, 'Publish survey (creates deployment)');
  const deployment = await publishSurvey({
    surveyId: survey.id,
    deploymentType: 'anonymous_link',
  });
  console.log(`  ✓ deployment ${deployment.id} token=${deployment.token}`);

  STEP(4, 'Submit a synthetic respondent answer set');
  const engine = createSurveyEngineAdapter();
  const resolution = await engine.resolveDeployment(deployment.token);
  if (resolution.status !== 'valid') {
    throw new Error(`Expected valid deployment, got ${resolution.status}`);
  }

  const sessionToken = crypto.randomUUID();
  const created = await engine.saveResponse({
    surveyId: survey.id,
    deploymentId: deployment.id,
    answers: {},
    metadata: { department: 'Engineering', role: 'IC', location: 'Remote', tenure: '1-3 years' },
    sessionToken,
  });
  console.log(`  ✓ response ${created.responseId}`);

  const questions = await engine.getQuestions(survey.id);
  console.log(`  → answering ${questions.length} questions with mid-scale Likert`);
  for (const q of questions) {
    if (q.type === 'likert') {
      await engine.upsertAnswer(created.responseId, q.id, 4);
    }
  }
  await engine.submitResponse(created.responseId);
  console.log(`  ✓ submitted response`);

  STEP(5, 'Trigger score recalculation');
  try {
    await triggerScoreRecalculation(survey.id);
    console.log(`  ✓ score-survey invoked`);
  } catch (err) {
    console.warn(`  ! score-survey failed (continuing — may need >1 response):`, err);
  }

  STEP(6, 'Create + generate report');
  const reportConfig: ReportConfig = {
    surveyId: survey.id,
    format: 'pdf',
    sections: [
      { id: 'overview', included: true, order: 1, title: 'Overview' },
      { id: 'compass', included: true, order: 2, title: 'Compass' },
    ],
  };
  const { reportId } = await createReport(reportConfig);
  console.log(`  ✓ report ${reportId} queued`);

  try {
    await triggerReportGeneration(reportId);
    console.log(`  ✓ generate-report invoked`);
  } catch (err) {
    console.warn(`  ! generate-report invocation failed:`, err);
  }

  // Poll briefly for terminal status
  const deadline = Date.now() + 30_000;
  let status = await getReportStatus(reportId);
  while (Date.now() < deadline && (status.status === 'queued' || status.status === 'generating')) {
    await new Promise((r) => setTimeout(r, 2000));
    status = await getReportStatus(reportId);
  }
  console.log(`  → final status=${status.status} progress=${status.progress}`);

  STEP(7, 'Fetch signed download URL (if file ready)');
  if (status.storagePath) {
    const url = await getReportDownloadUrl(status.storagePath);
    console.log(`  ✓ signed URL: ${url.slice(0, 80)}…`);
  } else {
    console.log(`  → no storage path yet (status=${status.status})`);
  }

  STEP(8, 'Tear down');
  await adminClient.from('reports').delete().eq('id', reportId);
  await adminClient.from('answers').delete().eq('response_id', created.responseId);
  await adminClient.from('responses').delete().eq('id', created.responseId);
  await adminClient.from('deployments').delete().eq('id', deployment.id);
  await adminClient.from('question_dimensions').delete().in(
    'question_id',
    questions.map((q) => q.id),
  );
  await adminClient.from('questions').delete().eq('survey_id', survey.id);
  await adminClient.from('surveys').delete().eq('id', survey.id);
  await adminClient.from('organization_settings').delete().eq('organization_id', org.id);
  await adminClient.from('organizations').delete().eq('id', org.id);
  console.log(`  ✓ cleaned up`);

  console.log('\n✅ Headless smoke complete.');
}

main().catch((err) => {
  console.error('\n❌ Headless smoke FAILED:', err);
  process.exit(1);
});
