/**
 * QA Flows 1.4 (Google) and 1.5 (Microsoft).
 *
 * Happy-path OAuth is untestable without real provider accounts — Supabase
 * needs to sign a JWT we can't fabricate. Those cases are `test.skip`.
 *
 * Deny path and button-presence cases are covered via Playwright route
 * interception on `**\/auth/v1/authorize**`. Supabase kicks the browser
 * to that URL before the provider redirect, so intercepting it there
 * avoids cross-origin complications.
 */

import { test, expect } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('OAuth sign-in', () => {
  test('both OAuth buttons render on /auth/login', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /continue with microsoft/i })).toBeVisible();
  });

  test('Google deny → returns to /auth/login with error param; form remains intact', async ({ page, baseURL }) => {
    const denyTarget = `${baseURL}/auth/login?error=access_denied`;

    await page.route('**/auth/v1/authorize**', (route) => {
      if (route.request().url().includes('provider=google')) {
        return route.fulfill({
          status: 302,
          headers: { Location: denyTarget },
          body: '',
        });
      }
      return route.continue();
    });

    await page.goto('/auth/login');
    await page.getByRole('button', { name: /continue with google/i }).click();

    await expect(page).toHaveURL(/error=access_denied/);
    // Form remains usable — user can retry with email or the other provider.
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /password/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /continue with microsoft/i })).toBeVisible();
    // TODO(login-page): render a visible error banner when `?error=` is present.

    await page.unroute('**/auth/v1/authorize**');
  });

  test('Microsoft deny → same pattern (provider=azure)', async ({ page, baseURL }) => {
    const denyTarget = `${baseURL}/auth/login?error=access_denied`;

    await page.route('**/auth/v1/authorize**', (route) => {
      if (route.request().url().includes('provider=azure')) {
        return route.fulfill({
          status: 302,
          headers: { Location: denyTarget },
          body: '',
        });
      }
      return route.continue();
    });

    await page.goto('/auth/login');
    await page.getByRole('button', { name: /continue with microsoft/i }).click();

    await expect(page).toHaveURL(/error=access_denied/);
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible();

    await page.unroute('**/auth/v1/authorize**');
  });

  test.skip('Google happy path — requires a real Google account + fabricated Supabase JWT', async () => {
    // Intentionally unimplementable in e2e without a live Google session.
    // Track as manual-only. When Supabase ships a test-mode issuer we can flip.
  });

  test.skip('Microsoft happy path — same limitation as Google', async () => {
    // See above.
  });
});
