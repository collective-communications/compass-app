/**
 * QA Flow 1.6 steps 6–7 — click recovery link → change password → sign in.
 *
 * Drives the full flow without an email fetch: use Supabase admin
 * `generateLink({ type: 'recovery', ... })` to produce a real recovery URL,
 * visit it, fill the form, and then sign in with the new credentials.
 * Teardown restores the original password so later specs aren't affected.
 */

import { test, expect } from '@playwright/test';
import { createAdminClient } from '../../helpers/db';
import { LoginPage } from '../../page-objects/login.page';

const TEST_EMAIL = 'exec@rivervalleyhealth.ca';
const ORIGINAL_PASSWORD = 'TestPass123!';
const NEW_PASSWORD = 'NewTestPass456!';
const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:42333';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe.serial('Password reset happy path (Flow 1.6 steps 6–7)', () => {
  // `http://localhost:42333/auth/reset-password` must be in the Supabase
  // project's URI allow-list, otherwise the recovery action_link redirects
  // to site_url root. Ensured via the tkr-deploy `configureAuth` step
  // (which pushes both APP_URL- and DEV_APP_URL-derived paths).
  test('recovery link opens reset form, new password sets, sign-in works', async ({ page }) => {
    const admin = createAdminClient();

    // Find the seeded user so teardown can reset their password at the end.
    // Paginate — ensureTestUser-style — so we're not tripped up by the
    // default 50-per-page limit once the dev project accumulates test users.
    let user: { id: string; email?: string } | undefined;
    for (let p = 1; p <= 20; p++) {
      const { data, error } = await admin.auth.admin.listUsers({ page: p, perPage: 200 });
      if (error) throw new Error(`listUsers page ${p} failed: ${error.message}`);
      user = data?.users?.find((u) => u.email === TEST_EMAIL);
      if (user || !data?.users || data.users.length < 200) break;
    }
    if (!user) throw new Error(`Seeded user ${TEST_EMAIL} missing — run db:seed`);

    // Supabase rejects recovery redirects that aren't on the project's
    // URI allow-list. Request the link with our local base URL so the
    // response's `action_link` lands us on the dev server.
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: TEST_EMAIL,
      options: { redirectTo: `${BASE_URL}/auth/reset-password` },
    });
    expect(error).toBeNull();
    const resetUrl = data?.properties?.action_link;
    expect(resetUrl).toBeTruthy();

    await page.goto(resetUrl!);

    // The action_link bounces through Supabase then lands on our reset
    // page with `#type=recovery&access_token=…&refresh_token=…`. Wait for
    // the form to render.
    // Two password fields share a "New password" prefix, so match exactly.
    const newPasswordField = page.getByLabel('New password', { exact: true });
    const confirmPasswordField = page.getByLabel('Confirm new password');
    await expect(newPasswordField).toBeVisible({ timeout: 15_000 });

    await newPasswordField.fill(NEW_PASSWORD);
    await confirmPasswordField.fill(NEW_PASSWORD);
    await page.getByRole('button', { name: /update password/i }).click();

    // Successful update redirects us to /auth/login?passwordReset=1.
    await page.waitForURL(/\/auth\/login\?passwordReset=1/, { timeout: 10_000 });
    await expect(page.getByRole('status')).toContainText(/password updated/i);

    // Sign in with the new password — proves the change stuck end-to-end.
    const login = new LoginPage(page);
    await login.login(TEST_EMAIL, NEW_PASSWORD);
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });

    // Teardown — restore the original password so later specs still work.
    await admin.auth.admin.updateUserById(user.id, { password: ORIGINAL_PASSWORD });
  });
});
