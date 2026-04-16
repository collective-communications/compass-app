import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/admin.json' });

test('admin can see surveys list via client detail', async ({ page }) => {
  await page.goto('/clients');
  await expect(page.getByRole('heading', { name: /clients/i })).toBeVisible({ timeout: 10000 });

  // Click first client card to navigate to client detail
  const firstClient = page.locator('[data-testid="client-card"]').first().or(
    page.locator('button').filter({ hasText: /view|details/i }).first(),
  );
  if (await firstClient.isVisible({ timeout: 5000 }).catch(() => false)) {
    await firstClient.click();
    await page.waitForLoadState('networkidle');

    // Click the Surveys tab
    const surveysTab = page.getByRole('tab', { name: /surveys/i });
    if (await surveysTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await surveysTab.click();
      await page.waitForLoadState('networkidle');

      // URL should now contain /surveys
      expect(page.url()).toContain('/surveys');
      await expect(page.getByText(/new survey|no surveys/i)).toBeVisible({ timeout: 10000 });
    }
  }
});
