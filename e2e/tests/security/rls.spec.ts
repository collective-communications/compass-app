import { test, expect } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

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

// --------------------------------------------------------------------------
// Tests
// --------------------------------------------------------------------------

test.describe('RLS perimeter', () => {
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
    const client = makeAnonClient();
    try {
      await signInAs(client, EMAILS.cccAdmin);

      // Responses: should return rows (not blocked).
      const responsesResp = await client.from('responses').select('id').limit(5);
      expect(responsesResp.error).toBeNull();
      expect(responsesResp.data).not.toBeNull();
      expect(responsesResp.data!.length).toBeGreaterThan(0);

      // Reports: both client_visible=true AND client_visible=false rows must be
      // visible to ccc_admin (policy `ccc_admin_all_reports`). Rather than pin
      // to specific seed UUIDs (which are stale — see the note in the
      // River Valley test), we assert the distribution: the unrestricted query
      // returns rows, and at least one row has `client_visible=false` — proving
      // the ccc_admin policy bypasses the client-visibility filter.
      const allReportsResp = await client.from('reports').select('id, client_visible');
      expect(allReportsResp.error).toBeNull();
      expect(allReportsResp.data).not.toBeNull();
      expect(allReportsResp.data!.length).toBeGreaterThan(0);
      const hasHidden = allReportsResp.data!.some((r) => r.client_visible === false);
      expect(hasHidden).toBe(true);
    } finally {
      await client.auth.signOut();
    }
  });

  test('anonymous (no sign-in) — responses blocked; surveys constrained to active/closed by anon policy', async () => {
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

      // ----- surveys: anon may read rows with status IN ('active','closed') -----
      // Migration 00000000000010 `anon_read_active_surveys` exists so that
      // the public `/s/$token` survey landing page can resolve a survey row
      // without a signed-in user. The perimeter assertion: anon must never
      // see `draft` or `archived` surveys, even though it can see
      // active/closed ones.
      const surveysResp = await client
        .from('surveys')
        .select('id, status, organization_id')
        .limit(100);
      expect(surveysResp.error).toBeNull();
      expect(surveysResp.data).not.toBeNull();
      for (const row of surveysResp.data!) {
        expect(['active', 'closed']).toContain(row.status);
      }
    } finally {
      await client.auth.signOut();
    }
  });
});
