import { test, expect } from '@playwright/test';

/**
 * Route-access E2E tests. Paths are flat (no `/admin` prefix) as of the
 * role-agnostic routes refactor. Access is enforced by the universal
 * `checkRouteAccess` matrix — forbidden paths redirect to the user's
 * tier home (ccc_admin/member → /clients, client roles → /dashboard).
 */

// ─── Tier 2: client user ─────────────────────────────────────────────────────

test.describe('Route access — client user', () => {
  test.use({ storageState: 'e2e/.auth/client.json' });

  test('redirects client user from /clients to /dashboard', async ({ page }) => {
    await page.goto('/clients');
    await page.waitForURL((url) => url.pathname.startsWith('/dashboard'), { timeout: 10000 });
    expect(page.url()).toContain('/dashboard');
  });

  test('allows client user on /settings (tier-aware content)', async ({ page }) => {
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/settings/, { timeout: 10000 });
  });
});

// ─── Tier 1: ccc_admin ───────────────────────────────────────────────────────

test.describe('Route access — ccc_admin', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' });

  test('allows ccc_admin on /clients', async ({ page }) => {
    await page.goto('/clients');
    await expect(page.getByRole('heading', { name: /clients/i })).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(/\/clients/, { timeout: 10000 });
  });

  test('allows ccc_admin on /settings', async ({ page }) => {
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/settings/, { timeout: 10000 });
  });

  test('allows ccc_admin on /users', async ({ page }) => {
    await page.goto('/users');
    await expect(page).toHaveURL(/\/users/, { timeout: 10000 });
  });
});

// ─── Tier 2: director ────────────────────────────────────────────────────────

test.describe('Route access — director', () => {
  test.use({ storageState: 'e2e/.auth/director.json' });

  test('redirects director from /clients to /dashboard', async ({ page }) => {
    await page.goto('/clients');
    await page.waitForURL((url) => url.pathname.startsWith('/dashboard'), { timeout: 10000 });
    expect(page.url()).toContain('/dashboard');
  });
});

// ─── Tier 1: ccc_member (admin access but not CCC_ADMIN-only pages) ──────────

test.describe('Route access — ccc_member', () => {
  test.use({ storageState: 'e2e/.auth/ccc-member.json' });

  test('allows ccc_member on /clients', async ({ page }) => {
    await page.goto('/clients');
    await expect(page.getByRole('heading', { name: /clients/i })).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(/\/clients/, { timeout: 10000 });
  });

  test('allows ccc_member on /settings (tier-aware content)', async ({ page }) => {
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/settings/, { timeout: 10000 });
  });

  test('redirects ccc_member from /users to /clients (CCC_ADMIN only)', async ({ page }) => {
    await page.goto('/users');
    await page.waitForURL((url) => url.pathname.startsWith('/clients'), { timeout: 10000 });
    expect(page.url()).toContain('/clients');
  });
});

// ─── Tier 2: manager ─────────────────────────────────────────────────────────

test.describe('Route access — manager', () => {
  test.use({ storageState: 'e2e/.auth/manager.json' });

  test('redirects manager from /clients to /dashboard', async ({ page }) => {
    await page.goto('/clients');
    await page.waitForURL((url) => url.pathname.startsWith('/dashboard'), { timeout: 10000 });
    expect(page.url()).toContain('/dashboard');
  });

  test('allows manager on /settings (tier-aware content)', async ({ page }) => {
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/settings/, { timeout: 10000 });
  });
});
