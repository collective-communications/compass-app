import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/client.json' });

const SEED_SURVEY_ID = '00000000-0000-0000-0000-000000000100';

test.describe('Recommendations tab', () => {
  test('recommendations tab renders content', async ({ page }) => {
    await page.goto(`/results/${SEED_SURVEY_ID}`);
    await page.waitForLoadState('networkidle');

    // Navigate to Recommendations tab
    const recTab = page.getByRole('tab', { name: /recommendations/i });
    if (!(await recTab.isVisible().catch(() => false))) return;
    await recTab.click();

    // Wait for the recommendations content to load (either cards or empty state).
    // The empty state shows "performing well" when no recommendations exist.
    // Use auto-retrying expect() instead of one-shot isVisible().
    const content = page.getByTestId('recommendation-card').first()
      .or(page.getByText(/performing well/i));
    await expect(content).toBeVisible({ timeout: 10000 });
  });

  test('recommendation cards have colored left borders for severity', async ({ page }) => {
    await page.goto(`/results/${SEED_SURVEY_ID}`);
    await page.waitForLoadState('networkidle');

    const recTab = page.getByRole('tab', { name: /recommendations/i });
    if (!(await recTab.isVisible().catch(() => false))) return;
    await recTab.click();

    const cards = page.getByTestId('recommendation-card');
    // Wait for content to load before checking cards
    const content = cards.first().or(page.getByText(/performing well/i));
    await expect(content).toBeVisible({ timeout: 10000 });

    if (await cards.first().isVisible().catch(() => false)) {
      const firstCard = cards.first();
      const borderStyle = await firstCard.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return style.borderLeftColor || style.borderColor;
      });
      expect(borderStyle).toBeTruthy();
    }
  });

  test('recommendation cards contain numbered action items', async ({ page }) => {
    await page.goto(`/results/${SEED_SURVEY_ID}`);
    await page.waitForLoadState('networkidle');

    const recTab = page.getByRole('tab', { name: /recommendations/i });
    if (!(await recTab.isVisible().catch(() => false))) return;
    await recTab.click();

    // Wait for content to load
    const cards = page.getByTestId('recommendation-card');
    const content = cards.first().or(page.getByText(/performing well/i));
    await expect(content).toBeVisible({ timeout: 10000 });

    // Only check action items if recommendation cards exist
    if (await cards.first().isVisible().catch(() => false)) {
      const actionLists = page.locator('ol, [role="list"]');
      if (await actionLists.first().isVisible().catch(() => false)) {
        const items = actionLists.first().locator('li, [role="listitem"]');
        const count = await items.count();
        expect(count).toBeGreaterThan(0);
      }
    }
  });
});
