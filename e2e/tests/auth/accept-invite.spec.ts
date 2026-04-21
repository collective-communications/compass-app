import { test, expect } from '@playwright/test';
import { createAdminClient } from '../../helpers/db';

/**
 * Accept-invite end-to-end coverage.
 *
 * Covers the four token-validation branches of
 * `/auth/accept-invite?token=<uuid>`:
 *   1. Happy path — seeded invitation → form → submit → auto-sign-in → tier home.
 *   2. Valid UUID but no invitation row → "Invalid invitation" screen.
 *   3. Malformed (non-UUID) token → same invalid screen.
 *   4. No `token` param at all → same invalid screen.
 *
 * The happy-path case mutates shared seed state (deletes the auth user and
 * the invitation row), so this suite is declared serial and performs
 * explicit teardown before + after the happy-path test. Running the whole
 * suite back-to-back is safe because teardown re-inserts the seed row.
 */

// Seeded by `scripts/seed-dev.ts`:
const SEED_INVITATION_ID = '10000000-ccc0-4000-8000-000000000001';
const SEED_INVITATION_EMAIL = 'invited_member@collectivecommunication.ca';
const SEED_INVITATION_ROLE = 'ccc_member';
const SEED_CCC_ORG_ID = '00000000-0000-0000-0000-000000000001';

const VALID_UUID_NO_ROW = '00000000-0000-0000-0000-00000000dead';
const MALFORMED_TOKEN = 'INVALID';

const TEST_PASSWORD = 'InvitedMemberPass1234';
const TEST_FULL_NAME = 'Invited Member';

/**
 * Force the seeded invitation row to exist. Safe to call repeatedly.
 * Uses `activeCloses` semantics (now + 60d) so the row stays valid.
 */
async function resetSeedInvitation(): Promise<void> {
  const supabase = createAdminClient();

  // Ensure no stale auth user lingers with the invited email; if an earlier
  // happy-path run left one behind, delete it.
  const { data: existing } = await supabase.auth.admin.listUsers();
  const found = existing?.users?.find((u) => u.email === SEED_INVITATION_EMAIL);
  if (found) {
    await supabase.auth.admin.deleteUser(found.id);
  }

  // Clear any validation-token rows tied to this invitation id so the
  // rate-limit window starts clean for the test run.
  await supabase
    .from('invitation_validation_tokens')
    .delete()
    .eq('invitation_id', SEED_INVITATION_ID);

  // Expiry set 60 days in the future — same semantics as the seed's
  // `DATES.activeCloses`. Using a Date computed here keeps the test
  // self-contained without importing the seed module.
  const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from('invitations').upsert(
    {
      id: SEED_INVITATION_ID,
      email: SEED_INVITATION_EMAIL,
      role: SEED_INVITATION_ROLE,
      organization_id: SEED_CCC_ORG_ID,
      expires_at: expiresAt,
    },
    { onConflict: 'id' },
  );
  if (error) {
    throw new Error(`Failed to restore seed invitation row: ${error.message}`);
  }
}

test.describe('Accept invite — token validation branches', () => {
  // Ensure no prior sign-in leaks into the form state.
  test.use({ storageState: { cookies: [], origins: [] } });

  test('valid-shaped UUID with no DB row → invalid invitation screen', async ({ page }) => {
    await page.goto(`/auth/accept-invite?token=${VALID_UUID_NO_ROW}`);
    await expect(
      page.getByRole('heading', { name: 'Invalid invitation' }),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('malformed (non-UUID) token → invalid invitation screen', async ({ page }) => {
    await page.goto(`/auth/accept-invite?token=${MALFORMED_TOKEN}`);
    await expect(
      page.getByRole('heading', { name: 'Invalid invitation' }),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('missing token param → invalid invitation screen', async ({ page }) => {
    await page.goto('/auth/accept-invite');
    await expect(
      page.getByRole('heading', { name: 'Invalid invitation' }),
    ).toBeVisible({ timeout: 15_000 });
  });
});

// Happy path is isolated in its own serial block because it mutates shared
// seed state (deletes auth user, deletes invitation row). Both before/after
// hooks restore the invitation row so concurrent suites aren't affected.
test.describe.serial('Accept invite — happy path', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeAll(async () => {
    await resetSeedInvitation();
  });

  test.afterAll(async () => {
    // Restore the invitation so re-runs (and other suites) start clean.
    await resetSeedInvitation();
  });

  test('valid token renders form, submits, auto-signs-in, lands on /clients', async ({ page }) => {
    await page.goto(`/auth/accept-invite?token=${SEED_INVITATION_ID}`);

    // Form heading renders once GET /accept-invitation resolves.
    await expect(
      page.getByRole('heading', { name: 'Create your account' }),
    ).toBeVisible({ timeout: 15_000 });

    // Email field is prefilled & disabled.
    const emailInput = page.getByLabel('Email');
    await expect(emailInput).toHaveValue(SEED_INVITATION_EMAIL);
    await expect(emailInput).toBeDisabled();

    // Role + org are echoed in the helper paragraph.
    await expect(page.getByText(/CC\+C Team Member/)).toBeVisible();

    // Fill and submit.
    await page.getByLabel('Full name').fill(TEST_FULL_NAME);
    await page.getByLabel('Password', { exact: true }).fill(TEST_PASSWORD);
    await page.getByLabel('Confirm password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /create account/i }).click();

    // Accept-invite auto-signs-in a freshly-created user and routes to the
    // tier home — for `ccc_member` that is `/clients`.
    await page.waitForURL((url) => url.pathname.startsWith('/clients'), {
      timeout: 20_000,
    });
    expect(new URL(page.url()).pathname.startsWith('/clients')).toBe(true);
  });
});
