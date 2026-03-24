import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/admin.json' });

const SEED_SURVEY_ID = '00000000-0000-0000-0000-000000000100';

test('results tab navigation renders', async ({ page }) => {
  await page.goto(`/results/${SEED_SURVEY_ID}/compass`);

  // Wait for the results page to fully load (may redirect through auth)
  await page.waitForURL((url) => url.pathname.includes('/results'), { timeout: 15000 });

  // Assert tab navigation is present
  await expect(page.getByRole('navigation').first()).toBeVisible({ timeout: 10000 });
});
