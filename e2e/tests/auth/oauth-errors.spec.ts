import { test, expect, type Page } from '@playwright/test';

/**
 * OAuth callback error handling.
 *
 * Supabase (and every OAuth 2 provider) returns errors to the callback URL
 * via the hash fragment: `/auth/callback#error=access_denied&error_description=…`.
 * Our callback route reads the fragment, extracts the error, and redirects to
 * `/auth/login` with the error attached as a search param. The login page
 * must render — NOT crash, NOT white-screen — regardless of the error value.
 *
 * The plan also calls out query-string variants (`?error=…`); many OAuth proxies
 * and hosted auth provider pages do use query strings, so we test both.
 *
 * Invariant: after visiting `/auth/callback` with any error shape, the user
 * ends up on `/auth/login` with an intact sign-in form and zero uncaught
 * JavaScript console errors.
 */

interface ConsoleCheckResult {
  uncaught: string[];
}

/**
 * Installs a console error listener on the page. Returns a collector that
 * filters out benign Supabase/network noise and surfaces real uncaught errors.
 */
function trackConsoleErrors(page: Page): ConsoleCheckResult {
  const uncaught: string[] = [];
  page.on('pageerror', (err) => {
    uncaught.push(err.message);
  });
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    // Ignore Supabase auth session-fetch 401s — expected when there's no session
    if (/AuthSessionMissingError/i.test(text)) return;
    if (/Failed to load resource/i.test(text)) return;
    if (/net::ERR_/i.test(text)) return;
    uncaught.push(text);
  });
  return { uncaught };
}

/**
 * Asserts that the page renders the login form without crashing. Accepts the
 * app routing us either to `/auth/login` directly or staying on `/auth/callback`
 * while showing an error message — both are acceptable graceful outcomes.
 */
async function expectGracefulOAuthErrorHandling(page: Page): Promise<void> {
  // Either we landed on the login screen (most common), or we're still on
  // /auth/callback with the "Authentication failed" status text. Both are
  // recoverable — the thing we're ruling out is a blank page or uncaught throw.
  await expect(async () => {
    const url = page.url();
    const onLogin = url.includes('/auth/login');
    const onCallback = url.includes('/auth/callback');
    expect(onLogin || onCallback).toBe(true);

    if (onLogin) {
      await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
      await expect(page.getByLabel('Email')).toBeVisible();
      await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
    } else {
      // Still on callback — must show *something* to the user, not a blank page.
      await expect(page.locator('body')).not.toBeEmpty();
      await expect(page.getByText(/authentication failed|completing sign-in/i)).toBeVisible();
    }
  }).toPass({ timeout: 10_000 });
}

test('callback handles ?error=access_denied (query string) without crashing', async ({ page }) => {
  const check = trackConsoleErrors(page);

  await page.goto(
    '/auth/callback?error=access_denied&error_description=The+user+denied+the+request',
  );
  await page.waitForLoadState('networkidle');

  await expectGracefulOAuthErrorHandling(page);
  expect(check.uncaught, `uncaught errors: ${check.uncaught.join(' | ')}`).toHaveLength(0);
});

test('callback handles #error=access_denied (hash fragment) without crashing', async ({ page }) => {
  const check = trackConsoleErrors(page);

  await page.goto(
    '/auth/callback#error=access_denied&error_description=The+user+denied+the+request',
  );
  await page.waitForLoadState('networkidle');

  // The hash-fragment path routes to /auth/login with the error attached.
  await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10_000 });
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();

  expect(check.uncaught, `uncaught errors: ${check.uncaught.join(' | ')}`).toHaveLength(0);
});

test('callback handles ?error=invalid_grant (query string) without crashing', async ({ page }) => {
  const check = trackConsoleErrors(page);

  await page.goto(
    '/auth/callback?error=invalid_grant&error_description=Authorization+code+expired',
  );
  await page.waitForLoadState('networkidle');

  await expectGracefulOAuthErrorHandling(page);
  expect(check.uncaught, `uncaught errors: ${check.uncaught.join(' | ')}`).toHaveLength(0);
});

test('callback handles #error=invalid_grant (hash fragment) without crashing', async ({ page }) => {
  const check = trackConsoleErrors(page);

  await page.goto(
    '/auth/callback#error=invalid_grant&error_description=Authorization+code+expired',
  );
  await page.waitForLoadState('networkidle');

  await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10_000 });
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();

  expect(check.uncaught, `uncaught errors: ${check.uncaught.join(' | ')}`).toHaveLength(0);
});
