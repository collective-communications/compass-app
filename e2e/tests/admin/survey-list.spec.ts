import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/admin.json' });

test('admin can see surveys list', async ({ page }) => {
  await page.goto('/admin/surveys');
  await expect(page.getByRole('heading', { name: /surveys/i })).toBeVisible();
});
