import { test, expect } from '@playwright/test';

test.describe('Admin route guard — client user', () => {
  test.use({ storageState: 'e2e/.auth/client.json' });

  test('redirects non-admin to /dashboard', async ({ page }) => {
    await page.goto('/admin/clients');

    // Client users should be redirected away from /admin routes
    await page.waitForURL((url) => !url.pathname.startsWith('/admin'), { timeout: 10000 });
    expect(page.url()).toContain('/dashboard');
  });

  test('redirects non-admin from /admin/settings', async ({ page }) => {
    await page.goto('/admin/settings');
    await page.waitForURL((url) => !url.pathname.startsWith('/admin'), { timeout: 10000 });
    expect(page.url()).toContain('/dashboard');
  });
});

test.describe('Admin route guard — admin user', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' });

  test('allows admin user to access /admin/clients', async ({ page }) => {
    await page.goto('/admin/clients');

    // Admin should stay on the admin page
    await expect(page.getByRole('heading', { name: /clients/i })).toBeVisible({ timeout: 10000 });
    expect(page.url()).toContain('/admin');
  });

  test('allows admin user to access /admin/settings', async ({ page }) => {
    await page.goto('/admin/settings');
    await expect(page).toHaveURL(/\/admin\/settings/, { timeout: 10000 });
  });

  test('allows admin user to access /admin/settings/users', async ({ page }) => {
    await page.goto('/admin/settings/users');
    await expect(page).toHaveURL(/\/admin\/settings\/users/, { timeout: 10000 });
  });
});

test.describe('Admin route guard — director user', () => {
  test.use({ storageState: 'e2e/.auth/director.json' });

  test('redirects director from /admin/clients to /dashboard', async ({ page }) => {
    await page.goto('/admin/clients');
    await page.waitForURL((url) => !url.pathname.startsWith('/admin'), { timeout: 10000 });
    expect(page.url()).toContain('/dashboard');
  });
});

test.describe('Admin route guard — ccc_member user (tier_1, non-admin)', () => {
  test.use({ storageState: 'e2e/.auth/ccc-member.json' });

  test('allows ccc_member to access /admin/clients', async ({ page }) => {
    await page.goto('/admin/clients');
    await expect(page.getByRole('heading', { name: /clients/i })).toBeVisible({ timeout: 10000 });
    expect(page.url()).toContain('/admin/clients');
  });

  test('redirects ccc_member from /admin/settings to /admin/clients', async ({ page }) => {
    await page.goto('/admin/settings');
    await page.waitForURL((url) => url.pathname.includes('/admin/clients'), { timeout: 10000 });
    expect(page.url()).toContain('/admin/clients');
  });

  test('redirects ccc_member from /admin/settings/users to /admin/clients', async ({ page }) => {
    await page.goto('/admin/settings/users');
    await page.waitForURL((url) => url.pathname.includes('/admin/clients'), { timeout: 10000 });
    expect(page.url()).toContain('/admin/clients');
  });
});

test.describe('Admin route guard — manager user', () => {
  test.use({ storageState: 'e2e/.auth/manager.json' });

  test('redirects manager from /admin/clients to /dashboard', async ({ page }) => {
    await page.goto('/admin/clients');
    await page.waitForURL((url) => !url.pathname.startsWith('/admin'), { timeout: 10000 });
    expect(page.url()).toContain('/dashboard');
  });

  test('redirects manager from /admin/settings to /dashboard', async ({ page }) => {
    await page.goto('/admin/settings');
    await page.waitForURL((url) => !url.pathname.startsWith('/admin'), { timeout: 10000 });
    expect(page.url()).toContain('/dashboard');
  });
});
