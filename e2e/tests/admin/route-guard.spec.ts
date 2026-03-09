import { test, expect } from '@playwright/test';

test.describe('Admin route guard — client user', () => {
  test.use({ storageState: 'e2e/.auth/client.json' });

  test('redirects non-admin to /dashboard', async ({ page }) => {
    await page.goto('/admin/surveys');

    // Client users should be redirected away from /admin routes
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
