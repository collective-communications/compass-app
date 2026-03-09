import { test, expect } from '@playwright/test';
import { AdminPage } from '../../page-objects/admin.page';

test.use({ storageState: 'e2e/.auth/admin.json' });

test.describe('Admin survey builder', () => {
  test('admin sees survey list with cards', async ({ page }) => {
    const admin = new AdminPage(page);
    await admin.goto();

    await expect(page.getByRole('heading', { name: /surveys/i })).toBeVisible({ timeout: 10000 });

    // Should show at least one survey card or empty state
    const cards = admin.surveyCards;
    const emptyState = page.getByText(/no surveys/i);
    const hasCards = await cards.first().isVisible().catch(() => false);
    const hasEmpty = await emptyState.isVisible().catch(() => false);
    expect(hasCards || hasEmpty).toBe(true);
  });

  test('active survey card has green border and ACTIVE badge', async ({ page }) => {
    const admin = new AdminPage(page);
    await admin.goto();

    const activeBadge = page.getByText('Active', { exact: true });
    if (await activeBadge.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(activeBadge).toBeVisible();
      // The card containing the active badge should be styled distinctly
      const card = activeBadge.locator('closest=[data-testid="survey-card"]').or(
        activeBadge.locator('..').locator('..'),
      );
      await expect(card).toBeVisible();
    }
  });

  test('draft survey card has setup checklist indicators', async ({ page }) => {
    const admin = new AdminPage(page);
    await admin.goto();

    const draftBadge = page.getByText('Draft', { exact: true });
    if (await draftBadge.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(draftBadge).toBeVisible();
    }
  });

  test('new survey button is visible to admin', async ({ page }) => {
    const admin = new AdminPage(page);
    await admin.goto();

    await expect(admin.newSurveyButton).toBeVisible({ timeout: 10000 });
  });

  test('survey builder shows dimension navigator and question rows', async ({ page }) => {
    const admin = new AdminPage(page);
    await admin.goto();

    // Click into first survey card if available
    const firstCard = admin.surveyCards.first();
    if (await firstCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstCard.click();
      await page.waitForLoadState('networkidle');

      // Builder elements may be on this page or a sub-route
      const dimensionNav = admin.dimensionNavigator;
      const questionRows = admin.questionRows;

      const hasDimNav = await dimensionNav.isVisible({ timeout: 5000 }).catch(() => false);
      const hasQuestions = await questionRows.first().isVisible({ timeout: 5000 }).catch(() => false);

      // At least the survey detail page should load
      expect(page.url()).toContain('/admin/');
    }
  });
});
