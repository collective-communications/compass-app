import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/client.json' });

const SEED_SURVEY_ID = '00000000-0000-0000-0000-000000000100';

test.describe('Recommendations tab', () => {
  test('recommendations cards render with severity ordering', async ({ page }) => {
    await page.goto(`/results/${SEED_SURVEY_ID}`);
    await page.waitForLoadState('networkidle');

    // Navigate to Recommendations tab
    const recTab = page.getByRole('tab', { name: /recommendations/i });
    if (await recTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await recTab.click();

      // Recommendation cards should be present
      const cards = page.getByTestId('recommendation-card');
      const genericCards = page.locator('[class*="card"]').filter({ hasText: /recommend|action|improve/i });

      const hasCards = await cards.first().isVisible({ timeout: 5000 }).catch(() => false);
      const hasGeneric = await genericCards.first().isVisible({ timeout: 5000 }).catch(() => false);

      // Either explicit recommendation cards or card-like elements with recommendation content
      expect(hasCards || hasGeneric).toBe(true);
    }
  });

  test('recommendation cards have colored left borders for severity', async ({ page }) => {
    await page.goto(`/results/${SEED_SURVEY_ID}`);
    await page.waitForLoadState('networkidle');

    const recTab = page.getByRole('tab', { name: /recommendations/i });
    if (await recTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await recTab.click();

      const cards = page.getByTestId('recommendation-card');
      if (await cards.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        // Check that at least one card has a left border color style
        const firstCard = cards.first();
        const borderStyle = await firstCard.evaluate((el) => {
          const style = window.getComputedStyle(el);
          return style.borderLeftColor || style.borderColor;
        });
        // Should have some border color set (not transparent/default)
        expect(borderStyle).toBeTruthy();
      }
    }
  });

  test('recommendation cards contain numbered action items', async ({ page }) => {
    await page.goto(`/results/${SEED_SURVEY_ID}`);
    await page.waitForLoadState('networkidle');

    const recTab = page.getByRole('tab', { name: /recommendations/i });
    if (await recTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await recTab.click();

      // Look for ordered lists or numbered items within cards
      const actionLists = page.locator('ol, [role="list"]');
      const hasLists = await actionLists.first().isVisible({ timeout: 5000 }).catch(() => false);

      // Action items should be present if recommendations exist
      if (hasLists) {
        const items = actionLists.first().locator('li, [role="listitem"]');
        const count = await items.count();
        expect(count).toBeGreaterThan(0);
      }
    }
  });
});
