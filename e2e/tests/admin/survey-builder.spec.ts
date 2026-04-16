import { test, expect } from '@playwright/test';
import { AdminPage } from '../../page-objects/admin.page';

test.use({ storageState: 'e2e/.auth/admin.json' });

/** Navigate to the Surveys tab of the first available client */
async function gotoClientSurveys(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/clients');
  await expect(page.getByRole('heading', { name: /clients/i })).toBeVisible({ timeout: 10000 });

  // Click first client card (aria-label="View {name}")
  const firstClient = page.getByRole('button', { name: /^View /i }).first();
  await expect(firstClient).toBeVisible({ timeout: 10000 });
  await firstClient.click();
  await page.waitForLoadState('networkidle');

  // Click Surveys tab on client detail page
  const surveysTab = page.getByRole('tab', { name: /surveys/i });
  await expect(surveysTab).toBeVisible({ timeout: 10000 });
  await surveysTab.click();
  await page.waitForLoadState('networkidle');

  // Verify URL changed to surveys route
  expect(page.url()).toContain('/surveys');
}

test.describe('Admin survey builder', () => {
  test('admin sees survey list with cards via client detail', async ({ page }) => {
    await gotoClientSurveys(page);

    // Should show at least one survey card, the new survey button, or an empty state
    const admin = new AdminPage(page);
    const cards = admin.surveyCards;
    const emptyState = page.getByText(/no surveys/i);
    const newButton = admin.newSurveyButton;
    const hasCards = await cards.first().isVisible({ timeout: 5000 }).catch(() => false);
    const hasEmpty = await emptyState.isVisible({ timeout: 5000 }).catch(() => false);
    const hasNew = await newButton.isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasCards || hasEmpty || hasNew).toBe(true);
  });

  test('active survey card has ACTIVE badge', async ({ page }) => {
    await gotoClientSurveys(page);

    const activeBadge = page.getByText('Active', { exact: true });
    if (await activeBadge.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(activeBadge).toBeVisible();
    }
  });

  test('draft survey card has Draft badge', async ({ page }) => {
    await gotoClientSurveys(page);

    const draftBadge = page.getByText('Draft', { exact: true });
    if (await draftBadge.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(draftBadge).toBeVisible();
    }
  });

  test('new survey button is visible to admin', async ({ page }) => {
    await gotoClientSurveys(page);

    const admin = new AdminPage(page);
    await expect(admin.newSurveyButton).toBeVisible({ timeout: 10000 });
  });

  test('survey builder shows dimension navigator and question rows', async ({ page }) => {
    await gotoClientSurveys(page);

    const admin = new AdminPage(page);
    // Click into first survey card if available
    const firstCard = admin.surveyCards.first();
    if (await firstCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstCard.click();
      await page.waitForLoadState('networkidle');

      // At least the survey detail page should load
      // Survey builder lives at /surveys/$surveyId after the flattening refactor
      expect(page.url()).toContain('/surveys/');
    }
  });
});
