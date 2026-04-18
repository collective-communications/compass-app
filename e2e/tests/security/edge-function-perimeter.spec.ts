import { test, expect, request as playwrightRequest } from '@playwright/test';
import { createAdminClient } from '../../helpers/db';

/**
 * Edge-function security perimeter checks.
 *
 * These tests hit the Supabase Edge Runtime directly (not the SPA), so they
 * don't require a storage-state fixture. They assert:
 *
 *   1. `accept-invitation` enforces GET-before-POST: POSTing without a prior
 *      validation token returns 429 `VALIDATION_REQUIRED`.
 *   2. Malformed POST bodies are rejected with 400 `INVALID_REQUEST`.
 *   3. CORS allowlist is enforced: a request with a hostile `Origin` header
 *      does NOT receive an `Access-Control-Allow-Origin` echo from the
 *      function code.
 *
 * ## Environment requirements
 *
 * Requires:
 *   - `E2E_SUPABASE_URL` (or `VITE_SUPABASE_URL`)
 *   - `E2E_SUPABASE_ANON_JWT` — a legacy-format (JWT) anon key. Supabase's
 *     cloud gateway rejects the new short-form `sb_publishable_*` keys at the
 *     edge with `UNAUTHORIZED_INVALID_JWT_FORMAT` before our function runs, so
 *     the body/CORS assertions cannot reach function code without a proper
 *     JWT. Fetch one from the Supabase project's legacy-keys page and place
 *     it in `e2e/.env.e2e.local`.
 *
 * When the JWT is unavailable, the individual assertions below are marked
 * `test.skip()` at runtime so the suite still reports cleanly rather than
 * silently passing.
 */

const SUPABASE_URL = process.env.E2E_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '';
const ANON_JWT = process.env.E2E_SUPABASE_ANON_JWT ?? '';

const SEED_CLIENT_ORG_ID = '00000000-0000-0000-0000-000000000002';

/**
 * Probe whether the Supabase Edge gateway accepts our anon key. If it returns
 * `UNAUTHORIZED_INVALID_JWT_FORMAT` (or similar), our function never runs and
 * we can't meaningfully assert function-level behavior.
 */
async function probeGatewayReachable(): Promise<{ reachable: boolean; reason: string }> {
  if (!SUPABASE_URL || !ANON_JWT) {
    return {
      reachable: false,
      reason: 'E2E_SUPABASE_URL and E2E_SUPABASE_ANON_JWT must both be set',
    };
  }
  const ctx = await playwrightRequest.newContext();
  try {
    // Send a GET without a token — our function returns 400 INVALID_REQUEST.
    // If we get 401/403 from the gateway instead, the JWT was rejected upstream.
    const res = await ctx.get(`${SUPABASE_URL}/functions/v1/accept-invitation`, {
      headers: {
        apikey: ANON_JWT,
        Authorization: `Bearer ${ANON_JWT}`,
      },
    });
    if (res.status() === 401 || res.status() === 403) {
      const body = await res.text();
      return {
        reachable: false,
        reason: `gateway rejected anon JWT (status=${res.status()}): ${body.slice(0, 120)}`,
      };
    }
    return { reachable: true, reason: '' };
  } finally {
    await ctx.dispose();
  }
}

test.describe('Edge function: accept-invitation perimeter', () => {
  let validInvitationId: string | null = null;
  let gatewayReachable = false;
  let gatewaySkipReason = '';

  test.beforeAll(async () => {
    const probe = await probeGatewayReachable();
    gatewayReachable = probe.reachable;
    gatewaySkipReason = probe.reason;

    if (!gatewayReachable) return;

    // Seed a valid, unexpired invitation row so we have a real id to target.
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('invitations')
      .insert({
        email: `e2e-perimeter-${Date.now()}@test.compassapp.dev`,
        role: 'client_user',
        organization_id: SEED_CLIENT_ORG_ID,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('id')
      .single();

    if (error || !data) {
      throw new Error(`Failed to seed invitation: ${error?.message ?? 'no data'}`);
    }
    validInvitationId = data.id as string;
  });

  test.afterAll(async () => {
    if (!validInvitationId) return;
    const supabase = createAdminClient();
    await supabase.from('invitations').delete().eq('id', validInvitationId);
    await supabase
      .from('invitation_validation_tokens')
      .delete()
      .eq('invitation_id', validInvitationId);
  });

  test('POST without prior GET returns 429 VALIDATION_REQUIRED', async () => {
    test.skip(!gatewayReachable, gatewaySkipReason);

    const ctx = await playwrightRequest.newContext();
    try {
      const res = await ctx.post(`${SUPABASE_URL}/functions/v1/accept-invitation`, {
        headers: {
          apikey: ANON_JWT,
          Authorization: `Bearer ${ANON_JWT}`,
          'Content-Type': 'application/json',
        },
        data: {
          invitationId: validInvitationId,
          password: 'ValidPassword123!',
          fullName: 'Perimeter Test',
        },
      });

      expect(res.status()).toBe(429);
      const body = await res.json();
      expect(body).toMatchObject({ error: 'VALIDATION_REQUIRED' });
    } finally {
      await ctx.dispose();
    }
  });

  test('POST with malformed body returns 400 INVALID_REQUEST', async () => {
    test.skip(!gatewayReachable, gatewaySkipReason);

    const ctx = await playwrightRequest.newContext();
    try {
      const res = await ctx.post(`${SUPABASE_URL}/functions/v1/accept-invitation`, {
        headers: {
          apikey: ANON_JWT,
          Authorization: `Bearer ${ANON_JWT}`,
          'Content-Type': 'application/json',
        },
        // Not JSON — should trip the body-parse catch branch.
        data: '{ not: valid json',
      });

      expect(res.status()).toBe(400);
      const body = await res.json();
      expect(body).toMatchObject({ error: 'INVALID_REQUEST' });
    } finally {
      await ctx.dispose();
    }
  });

  test('POST with missing required fields returns 400 INVALID_REQUEST', async () => {
    test.skip(!gatewayReachable, gatewaySkipReason);

    const ctx = await playwrightRequest.newContext();
    try {
      const res = await ctx.post(`${SUPABASE_URL}/functions/v1/accept-invitation`, {
        headers: {
          apikey: ANON_JWT,
          Authorization: `Bearer ${ANON_JWT}`,
          'Content-Type': 'application/json',
        },
        // Valid JSON but missing `password` and `fullName`.
        data: { invitationId: validInvitationId },
      });

      expect(res.status()).toBe(400);
      const body = await res.json();
      expect(body).toMatchObject({ error: 'INVALID_REQUEST' });
    } finally {
      await ctx.dispose();
    }
  });

  test('POST with disallowed Origin header does not get the origin echoed back', async () => {
    test.skip(!gatewayReachable, gatewaySkipReason);

    const ctx = await playwrightRequest.newContext();
    try {
      const res = await ctx.post(`${SUPABASE_URL}/functions/v1/accept-invitation`, {
        headers: {
          apikey: ANON_JWT,
          Authorization: `Bearer ${ANON_JWT}`,
          'Content-Type': 'application/json',
          Origin: 'https://evil.example.com',
        },
        data: {
          invitationId: validInvitationId,
          password: 'ValidPassword123!',
          fullName: 'Perimeter Test',
        },
      });

      const headers = res.headers();

      // Our function MUST NOT echo a hostile Origin in Access-Control-Allow-Origin.
      // Note: the Supabase edge gateway may inject a wildcard on its own error
      // responses (e.g. 401 auth failures that never reach our code). Once the
      // request reaches our function — which we confirmed by requiring a valid
      // JWT above — the header should reflect our allowlist check in
      // `_shared/cors.ts`.
      expect(headers['access-control-allow-origin']).not.toBe('https://evil.example.com');
    } finally {
      await ctx.dispose();
    }
  });
});
