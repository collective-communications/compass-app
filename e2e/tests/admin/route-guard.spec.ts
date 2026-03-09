import { test, expect } from '@playwright/test';

test.describe('Admin route guard — client user', () => {
  test.use({ storageState: 'e2e/.auth/client.json' });

  test('redirects non-admin to /dashboard', async ({ page }) => {
    await page.goto('/admin/surveys');

    // Client users should be redirected away from /admin routes
    await page.waitForURL((url) => !url.pathname.startsWith('/admin'), { timeout: 10000 });
    expect(page.url()).toContain('/dashboard');
  });

  test('redirects non-admin from /admin/clients', async ({ page }) => {
    await page.goto('/admin/clients');
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

  test('allows admin user to access /admin', async ({ page }) => {
    await page.goto('/admin/surveys');

    // Admin should stay on the admin page
    await expect(page.getByRole('heading', { name: /surveys/i })).toBeVisible({ timeout: 10000 });
    expect(page.url()).toContain('/admin');
  });
});

test.describe('Admin route guard — director user', () => {
  test.use({ storageState: 'e2e/.auth/director.json' });

  test('redirects director from /admin/surveys to /dashboard', async ({ page }) => {
    await page.goto('/admin/surveys');
    await page.waitForURL((url) => !url.pathname.startsWith('/admin'), { timeout: 10000 });
    expect(page.url()).toContain('/dashboard');
  });

  test('redirects director from /admin/clients to /dashboard', async ({ page }) => {
    await page.goto('/admin/clients');
    await page.waitForURL((url) => !url.pathname.startsWith('/admin'), { timeout: 10000 });
    expect(page.url()).toContain('/dashboard');
  });
});

test.describe('Admin route guard — manager user', () => {
  test.use({ storageState: 'e2e/.auth/manager.json' });

  test('redirects manager from /admin/surveys to /dashboard', async ({ page }) => {
    await page.goto('/admin/surveys');
    await page.waitForURL((url) => !url.pathname.startsWith('/admin'), { timeout: 10000 });
    expect(page.url()).toContain('/dashboard');
  });

  test('redirects manager from /admin/settings to /dashboard', async ({ page }) => {
    await page.goto('/admin/settings');
    await page.waitForURL((url) => !url.pathname.startsWith('/admin'), { timeout: 10000 });
    expect(page.url()).toContain('/dashboard');
  });
});
