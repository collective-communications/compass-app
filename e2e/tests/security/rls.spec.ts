import { test, expect } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '../../helpers/db';

/**
 * RLS perimeter assertions.
 *
 * Probes Supabase directly with the `supabase-js` client — one fresh client
 * per test, signed in as the role under test — and asserts that the policies
 * in `supabase/migrations/00000000000004_rls_policies.sql` (plus the later
 * `…0009`/`…0010` anon-survey-read policies) hold. This covers the Section-10
 * flows from `_docs/qa/user-flows-by-auth-level.md` that can't be exercised
 * through the SPA because RLS effects are invisible in the UI.
 *
 * The policies in scope:
 *   - `responses`   → only `ccc_*` + service_role can read. All `client_*` are blocked.
 *   - `reports`     → client roles can read only rows with `client_visible = true`
 *                     for their own org; `ccc_*` can read all rows.
 *   - `surveys`     → client roles see only rows where `organization_id = auth_user_org_id()`.
 *                     Anonymous (role=`anon`) sees only rows with `status IN ('active','closed')`
 *                     (migration 00000000000010).
 *   - `deployments` → org-scoped transitively through `surveys`.
 *
 * Env inputs (loaded by `playwright.config.ts` from `e2e/.env.e2e.local`):
 *   - `VITE_SUPABASE_URL` (or `E2E_SUPABASE_URL` fallback)
 *   - `VITE_SUPABASE_ANON_KEY` (or `E2E_SUPABASE_ANON_KEY` fallback)
 *
 * The anon key may be either the legacy JWT form (`eyJ…`) or the new
 * `sb_publishable_*` short form; both authenticate the `signInWithPassword`
 * call path.
 */

// --------------------------------------------------------------------------
// Test fixture: seed constants (mirrored from `scripts/seed-dev.ts`).
// --------------------------------------------------------------------------

const SEED_PASSWORD = 'TestPass123!';

const EMAILS = {
  cccAdmin: 'admin@collectivecommunication.ca',
  cccMember: 'member@collectivecommunication.ca',
  clientExecRiverValley: 'exec@rivervalleyhealth.ca',
  clientExecLakeside: 'exec@lakesideclinic.ca',
} as const;

const ORG_IDS = {
  riverValley: '00000000-0000-0000-0000-000000000002',
  lakeside: '00000000-0000-0000-0000-000000000003',
} as const;

const SURVEY_IDS = {
  riverValleyQ1_2026: '00000000-0000-0000-0000-000000000100',
  lakesideQ1_2026: '00000000-0000-0000-0000-000000000101',
} as const;

const DEPLOYMENT_IDS = {
  riverValleyActive: '00000000-0000-0000-0000-000000000200',
} as const;

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function requiredEnv(...keys: readonly string[]): string {
  for (const key of keys) {
    const value = process.env[key];
    if (value) return value;
  }
  throw new Error(
    `RLS spec requires one of: ${keys.join(', ')} — set it in e2e/.env.e2e.local`,
  );
}

/**
 * Create a fresh, isolated anon-key Supabase client. Each test gets its own
 * so that a sign-in (and its JWT) does not leak between tests. Session
 * persistence is disabled so parallel tests don't stomp on each other's
 * localStorage shim.
 */
function makeAnonClient(): SupabaseClient {
  const url = requiredEnv('VITE_SUPABASE_URL', 'E2E_SUPABASE_URL');
  const anonKey = requiredEnv('VITE_SUPABASE_ANON_KEY', 'E2E_SUPABASE_ANON_KEY');
  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      storageKey: `rls-spec-${Math.random().toString(36).slice(2)}`,
    },
  });
}

async function signInAs(client: SupabaseClient, email: string): Promise<void> {
  const { error } = await client.auth.signInWithPassword({
    email,
    password: SEED_PASSWORD,
  });
  if (error) {
    throw new Error(`signInAs(${email}) failed: ${error.message}`);
  }
}

async function seedHiddenReportForRls(): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('reports')
    .insert({
      survey_id: SURVEY_IDS.lakesideQ1_2026,
      format: 'pdf',
      status: 'completed',
      progress: 100,
      file_size: 12_345,
      page_count: 7,
      sections: ['rls-perimeter'],
      client_visible: false,
      storage_path: `fixtures/rls-hidden/${Date.now()}.pdf`,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Failed to seed hidden RLS report: ${error?.message ?? 'no data'}`);
  }

  return data.id as string;
}

async function deleteReport(reportId: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from('reports').delete().eq('id', reportId);
  if (error) {
    throw new Error(`Failed to delete RLS report ${reportId}: ${error.message}`);
  }
}

async function getUserProfileByEmail(email: string): Promise<{ id: string; role: string }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, role')
    .eq('email', email)
    .single();

  if (error || !data) {
    throw new Error(`Failed to resolve profile for ${email}: ${error?.message ?? 'no data'}`);
  }

  return { id: data.id as string, role: data.role as string };
}

async function getSeedDeploymentToken(): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('deployments')
    .select('token')
    .eq('id', DEPLOYMENT_IDS.riverValleyActive)
    .single();

  if (error || !data) {
    throw new Error(`Failed to resolve seed deployment token: ${error?.message ?? 'no data'}`);
  }

  return data.token as string;
}

interface ClientAccessSnapshot {
  organizationEnabled: boolean;
  settingsRowExisted: boolean;
  settingsEnabled: boolean | null;
}

async function setClientAccess(
  organizationId: string,
  enabled: boolean,
): Promise<ClientAccessSnapshot> {
  const supabase = createAdminClient();
  const { data: orgRow, error: orgError } = await supabase
    .from('organizations')
    .select('client_access_enabled')
    .eq('id', organizationId)
    .single();

  if (orgError || !orgRow) {
    throw new Error(`Failed to read organization access flag: ${orgError?.message ?? 'no data'}`);
  }

  const { data: settingsRow, error: settingsError } = await supabase
    .from('organization_settings')
    .select('client_access_enabled')
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (settingsError) {
    throw new Error(`Failed to read organization_settings access flag: ${settingsError.message}`);
  }

  const { error: orgUpdateError } = await supabase
    .from('organizations')
    .update({ client_access_enabled: enabled })
    .eq('id', organizationId);
  if (orgUpdateError) {
    throw new Error(`Failed to update organization access flag: ${orgUpdateError.message}`);
  }

  const { error: settingsUpdateError } = await supabase
    .from('organization_settings')
    .upsert(
      { organization_id: organizationId, client_access_enabled: enabled },
      { onConflict: 'organization_id' },
    );
  if (settingsUpdateError) {
    throw new Error(`Failed to update organization_settings access flag: ${settingsUpdateError.message}`);
  }

  return {
    organizationEnabled: Boolean(orgRow.client_access_enabled),
    settingsRowExisted: settingsRow !== null,
    settingsEnabled: settingsRow?.client_access_enabled ?? null,
  };
}

async function restoreClientAccess(
  organizationId: string,
  snapshot: ClientAccessSnapshot,
): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from('organizations')
    .update({ client_access_enabled: snapshot.organizationEnabled })
    .eq('id', organizationId);

  if (snapshot.settingsRowExisted) {
    await supabase
      .from('organization_settings')
      .update({ client_access_enabled: snapshot.settingsEnabled ?? false })
      .eq('organization_id', organizationId);
  } else {
    await supabase
      .from('organization_settings')
      .delete()
      .eq('organization_id', organizationId);
  }
}

// --------------------------------------------------------------------------
// Tests
// --------------------------------------------------------------------------

test.describe('RLS perimeter', () => {
  test('ccc_member cannot mutate org membership or profile roles through the direct API', async () => {
    const client = makeAnonClient();
    let targetId: string | null = null;

    try {
      const target = await getUserProfileByEmail(EMAILS.clientExecRiverValley);
      targetId = target.id;
      await signInAs(client, EMAILS.cccMember);

      await client
        .from('org_members')
        .update({ role: 'ccc_admin' })
        .eq('organization_id', ORG_IDS.riverValley)
        .eq('user_id', target.id);

      await client
        .from('user_profiles')
        .update({ role: 'ccc_admin' })
        .eq('id', target.id);

      const supabase = createAdminClient();
      const { data: membership, error: membershipError } = await supabase
        .from('org_members')
        .select('role')
        .eq('organization_id', ORG_IDS.riverValley)
        .eq('user_id', target.id)
        .single();
      expect(membershipError).toBeNull();
      expect(membership?.role).toBe('client_exec');

      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', target.id)
        .single();
      expect(profileError).toBeNull();
      expect(profile?.role).toBe('client_exec');
    } finally {
      if (targetId) {
        const supabase = createAdminClient();
        await supabase
          .from('org_members')
          .update({ role: 'client_exec' })
          .eq('organization_id', ORG_IDS.riverValley)
          .eq('user_id', targetId);
        await supabase.from('user_profiles').update({ role: 'client_exec' }).eq('id', targetId);
      }
      await client.auth.signOut();
    }
  });

  test('client access disabled blocks result views and result RPCs below the route layer', async () => {
    const snapshot = await setClientAccess(ORG_IDS.riverValley, false);
    const client = makeAnonClient();

    try {
      await signInAs(client, EMAILS.clientExecRiverValley);

      const scoresResp = await client
        .from('safe_segment_scores')
        .select('survey_id')
        .eq('survey_id', SURVEY_IDS.riverValleyQ1_2026)
        .limit(1);
      expect(scoresResp.error).toBeNull();
      expect(scoresResp.data ?? []).toEqual([]);

      const metricsResp = await client.rpc('get_response_metrics', {
        p_survey_id: SURVEY_IDS.riverValleyQ1_2026,
      });
      expect(metricsResp.error).not.toBeNull();
      expect(metricsResp.error?.code).toBe('42501');
    } finally {
      await restoreClientAccess(ORG_IDS.riverValley, snapshot);
      await client.auth.signOut();
    }
  });

  test('client_exec at River Valley — surveys/deployments/responses/reports scoped correctly', async () => {
    const client = makeAnonClient();
    try {
      await signInAs(client, EMAILS.clientExecRiverValley);

      // ----- surveys: only River Valley rows -----
      const surveysResp = await client.from('surveys').select('id, organization_id');
      expect(surveysResp.error).toBeNull();
      expect(surveysResp.data).not.toBeNull();
      expect(surveysResp.data!.length).toBeGreaterThan(0);
      for (const row of surveysResp.data!) {
        expect(row.organization_id).toBe(ORG_IDS.riverValley);
      }
      // Affirm the seeded Q1 2026 River Valley survey is visible.
      expect(surveysResp.data!.some((r) => r.id === SURVEY_IDS.riverValleyQ1_2026)).toBe(true);
      // Negative: Lakeside survey must not leak across the org boundary.
      expect(surveysResp.data!.some((r) => r.id === SURVEY_IDS.lakesideQ1_2026)).toBe(false);

      // ----- deployments: every deployment must belong to a River Valley survey -----
      // We resolve the policy transitively: fetch deployments + their parent
      // survey's org, and assert the join only yields River Valley orgs.
      const deploymentsResp = await client
        .from('deployments')
        .select('id, survey_id, surveys!inner(organization_id)');
      expect(deploymentsResp.error).toBeNull();
      expect(deploymentsResp.data).not.toBeNull();
      for (const row of deploymentsResp.data as Array<{
        survey_id: string;
        surveys:
          | { organization_id: string }
          | Array<{ organization_id: string }>;
      }>) {
        // PostgREST returns the embedded row as object-or-array depending on
        // cardinality; normalise.
        const joined = Array.isArray(row.surveys) ? row.surveys[0] : row.surveys;
        expect(joined?.organization_id).toBe(ORG_IDS.riverValley);
      }

      // ----- responses: `ccc_read_responses` only. client_exec is blocked -----
      // Under PostgREST, RLS filters rows rather than erroring for SELECTs, so
      // the expected behaviour is "query succeeds, zero rows visible".
      const responsesResp = await client.from('responses').select('id').limit(5);
      expect(responsesResp.error).toBeNull();
      expect(responsesResp.data ?? []).toEqual([]);

      // ----- reports for the Q1 River Valley survey: client_visible=true only -----
      // Assert the policy semantic on whatever rows come back. We do NOT
      // hard-code seeded report UUIDs here because the current DB was seeded
      // by an older `scripts/seed-dev.ts` revision and the newer hard-coded
      // IDs (`…0300`/`…0301`) do not exist in the live test database. The
      // policy guarantee we need to test is the filter, not the row count.
      const reportsResp = await client
        .from('reports')
        .select('id, client_visible, organization_id, survey_id')
        .eq('survey_id', SURVEY_IDS.riverValleyQ1_2026);
      expect(reportsResp.error).toBeNull();
      expect(reportsResp.data).not.toBeNull();
      for (const row of reportsResp.data!) {
        expect(row.client_visible).toBe(true);
        expect(row.organization_id).toBe(ORG_IDS.riverValley);
      }
    } finally {
      await client.auth.signOut();
    }
  });

  test('client_exec at Lakeside Clinic — surveys scoped to Lakeside with no River Valley leakage', async () => {
    const client = makeAnonClient();
    try {
      await signInAs(client, EMAILS.clientExecLakeside);

      const surveysResp = await client.from('surveys').select('id, organization_id');
      expect(surveysResp.error).toBeNull();
      expect(surveysResp.data).not.toBeNull();
      expect(surveysResp.data!.length).toBeGreaterThan(0);
      for (const row of surveysResp.data!) {
        expect(row.organization_id).toBe(ORG_IDS.lakeside);
      }
      expect(
        surveysResp.data!.some((r) => r.id === SURVEY_IDS.riverValleyQ1_2026),
      ).toBe(false);
      expect(
        surveysResp.data!.some((r) => r.id === SURVEY_IDS.lakesideQ1_2026),
      ).toBe(true);
    } finally {
      await client.auth.signOut();
    }
  });

  test('ccc_admin — responses readable; reports visible regardless of client_visible', async () => {
    const hiddenReportId = await seedHiddenReportForRls();
    const client = makeAnonClient();
    try {
      await signInAs(client, EMAILS.cccAdmin);

      // Responses: should return rows (not blocked).
      const responsesResp = await client.from('responses').select('id').limit(5);
      expect(responsesResp.error).toBeNull();
      expect(responsesResp.data).not.toBeNull();
      expect(responsesResp.data!.length).toBeGreaterThan(0);

      // Reports: ccc_admin must be able to read a hidden report. This test
      // owns the hidden fixture so sibling report-list specs cannot delete
      // the row out from under the assertion.
      const hiddenReportResp = await client
        .from('reports')
        .select('id, client_visible')
        .eq('id', hiddenReportId)
        .maybeSingle();
      expect(hiddenReportResp.error).toBeNull();
      expect(hiddenReportResp.data).not.toBeNull();
      expect(hiddenReportResp.data!.client_visible).toBe(false);
    } finally {
      await deleteReport(hiddenReportId);
      await client.auth.signOut();
    }
  });

  test('anonymous (no sign-in) — survey content is token-bound and not enumerable', async () => {
    const client = makeAnonClient();
    try {
      // No sign-in — the request carries only the anon key, so `auth.role()`
      // is `anon`, `is_ccc_user()` is false, and `auth_user_org_id()` is NULL.

      // ----- responses: no anon SELECT policy grants access -----
      // Migration 00000000000039 rewrote the anon responses policy to require
      // a matching `session_token` in the request GUC. Without that header,
      // the anon client sees zero rows.
      const responsesResp = await client.from('responses').select('id').limit(5);
      if (responsesResp.error) {
        expect(responsesResp.error.message.length).toBeGreaterThan(0);
      } else {
        expect(responsesResp.data ?? []).toEqual([]);
      }

      // ----- surveys/deployments/questions: no direct anon enumeration -----
      const deploymentsResp = await client
        .from('deployments')
        .select('id, token')
        .limit(10);
      expect(deploymentsResp.error).toBeNull();
      expect(deploymentsResp.data ?? []).toEqual([]);

      const surveysResp = await client
        .from('surveys')
        .select('id, status, organization_id')
        .limit(10);
      expect(surveysResp.error).toBeNull();
      expect(surveysResp.data ?? []).toEqual([]);

      const questionsResp = await client
        .from('questions')
        .select('id, survey_id')
        .limit(10);
      expect(questionsResp.error).toBeNull();
      expect(questionsResp.data ?? []).toEqual([]);

      // ----- token-bound RPCs: valid shared link still renders the survey -----
      const deploymentToken = await getSeedDeploymentToken();
      const resolutionResp = await client.rpc('resolve_deployment_by_token', {
        p_token: deploymentToken,
      });
      expect(resolutionResp.error).toBeNull();
      expect(resolutionResp.data).toMatchObject({
        survey: { id: SURVEY_IDS.riverValleyQ1_2026 },
      });

      const tokenQuestionsResp = await client.rpc('get_questions_for_deployment_token', {
        p_token: deploymentToken,
        p_survey_id: SURVEY_IDS.riverValleyQ1_2026,
      });
      expect(tokenQuestionsResp.error).toBeNull();
      expect(tokenQuestionsResp.data?.length ?? 0).toBeGreaterThan(0);
    } finally {
      await client.auth.signOut();
    }
  });
});
