/**
 * QA Flows 9.9 (session expiry) and 9.10 (concurrent sessions).
 *
 * `guardRoute` reads `useAuthStore.getState().user` synchronously from zustand,
 * not from `supabase.auth.getSession()`. The zustand store is populated per
 * `AuthProvider` mount via `onAuthStateChange('INITIAL_SESSION')`. Clearing
 * localStorage mid-session does NOT invalidate the in-memory store for a
 * client-side SPA navigation. A full `page.goto()` is required to re-mount
 * the provider with no session — which triggers the guard to bounce.
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../../page-objects/login.page';

const SUPABASE_AUTH_KEY = 'sb-gscaczmrruzymzdpzohr-auth-token';
const ACTIVE_SURVEY_ID = '00000000-0000-0000-0000-000000000100';

test.describe('Session lifecycle', () => {
  test('Flow 9.9 — localStorage.clear mid-session → guard bounces with returnTo', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: 'e2e/.auth/admin.json' });
    const page = await ctx.newPage();

    await page.goto('/clients');
    await expect(page).toHaveURL(/\/clients/);

    await page.evaluate(() => localStorage.clear());
    await ctx.clearCookies();

    await page.goto('/settings');
    await expect(page).toHaveURL(/\/auth\/login\?returnTo=%2Fsettings/);

    await ctx.close();
  });

  test('Flow 9.9 — tampered auth token → next navigation bounces with returnTo', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: 'e2e/.auth/client.json' });
    const page = await ctx.newPage();

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);

    await page.evaluate((key) => {
      localStorage.setItem(key, 'invalid-json-garbage');
    }, SUPABASE_AUTH_KEY);
    await ctx.clearCookies();

    const target = `/results/${ACTIVE_SURVEY_ID}/compass`;
    await page.goto(target);
    await expect(page).toHaveURL(new RegExp(`/auth/login\\?returnTo=${encodeURIComponent(target).replace(/%/g, '%')}`));

    await ctx.close();
  });

  test('Flow 9.10 — concurrent sessions remain independent', async ({ browser }) => {
    const ctxA = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const ctxB = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    const loginA = new LoginPage(pageA);
    await loginA.goto();
    await loginA.login('admin@collectivecommunication.ca', 'TestPass123!');
    await pageA.waitForURL(/\/clients/, { timeout: 15_000 });

    const loginB = new LoginPage(pageB);
    await loginB.goto();
    await loginB.login('user@rivervalleyhealth.ca', 'TestPass123!');
    await pageB.waitForURL(/\/dashboard/, { timeout: 15_000 });

    // Role-distinct behaviour: A has tier-1 access, B does not.
    await pageA.goto('/users');
    await expect(pageA).toHaveURL(/\/users$/);

    await pageB.goto('/users');
    await expect(pageB).toHaveURL(/\/dashboard/);

    // Each context retains its own session after a reload.
    await pageA.reload();
    await expect(pageA).toHaveURL(/\/users$/);

    await pageB.reload();
    await expect(pageB).toHaveURL(/\/dashboard/);

    await ctxA.close();
    await ctxB.close();
  });
});
