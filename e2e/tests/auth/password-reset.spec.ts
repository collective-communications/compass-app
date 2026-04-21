/**
 * QA Flow 1.6 steps 6–7 — click recovery link → change password → sign in.
 *
 * BLOCKER: `/auth/reset-password` is not a registered route today. Kept as
 * `test.fixme` until the reset-password route + form ship.
 */

import { test, expect } from '@playwright/test';
import { createAdminClient } from '../../helpers/db';
import { LoginPage } from '../../page-objects/login.page';

const TEST_EMAIL = 'exec@rivervalleyhealth.ca';
const ORIGINAL_PASSWORD = 'TestPass123!';
const NEW_PASSWORD = 'NewTestPass456!';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe.serial('Password reset happy path (Flow 1.6 steps 6–7)', () => {
  test.fixme('recovery link opens reset form, new password sets, sign-in works', async ({ page }) => {
    // When unblocked, the flow is:
    const admin = createAdminClient();
    const { data: userList } = await admin.auth.admin.listUsers();
    const user = userList?.users.find((u) => u.email === TEST_EMAIL);
    if (!user) throw new Error(`Seeded user ${TEST_EMAIL} missing`);

    const { data, error } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: TEST_EMAIL,
    });
    expect(error).toBeNull();
    const resetUrl = data?.properties?.action_link;
    expect(resetUrl).toBeTruthy();

    await page.goto(resetUrl!);
    await expect(page.getByLabel(/new password|password/i).first()).toBeVisible({ timeout: 15_000 });
    await page.getByLabel(/new password|password/i).first().fill(NEW_PASSWORD);
    const confirm = page.getByLabel(/confirm.*password/i);
    if (await confirm.count() > 0) await confirm.fill(NEW_PASSWORD);
    await page.getByRole('button', { name: /update password|reset password|save password/i }).click();

    await page.waitForURL((url) => url.pathname !== '/auth/reset-password', { timeout: 10_000 });

    // Sign in with the new password
    await page.context().clearCookies();
    const login = new LoginPage(page);
    await login.goto();
    await login.login(TEST_EMAIL, NEW_PASSWORD);
    await expect(page).toHaveURL(/\/dashboard/);

    // Teardown — restore the original password so the rest of the e2e suite works.
    await admin.auth.admin.updateUserById(user.id, { password: ORIGINAL_PASSWORD });
  });
});
