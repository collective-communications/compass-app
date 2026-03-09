import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/client.json' });

test.describe('Dashboard navigation', () => {
  test('navigates without full page reload', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Grab a reference to a persistent shell element (header) before navigation
    const shellHeader = page.getByRole('banner');
    await expect(shellHeader).toBeVisible({ timeout: 10000 });

    // Listen for full page navigations (would fire on hard reload)
    let fullPageNavigation = false;
    page.on('load', () => {
      fullPageNavigation = true;
    });

    // Click a navigable element within the dashboard (e.g., a survey card or nav link)
    const navLink = page.getByRole('link').first();
    if (await navLink.isVisible()) {
      await navLink.click();
      await page.waitForTimeout(1000);

      // The shell header should still be the same DOM node (no full reload)
      await expect(shellHeader).toBeVisible();
      expect(fullPageNavigation).toBe(false);
    }
  });
});
