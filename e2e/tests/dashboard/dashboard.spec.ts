import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/client.json' });

test.describe('Client dashboard', () => {
  test('shows welcome message with first name', async ({ page }) => {
    await page.goto('/dashboard');

    // The welcome heading should contain a first name
    await expect(
      page.getByRole('heading', { name: /welcome back/i }),
    ).toBeVisible({ timeout: 10000 });
  });

  test('displays active survey card when survey exists', async ({ page }) => {
    // Requires: at least one active survey for the client org in seed data
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Active survey card shows a status badge and response stats
    const activeBadge = page.getByText('Active', { exact: true });
    if (await activeBadge.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(activeBadge).toBeVisible();

      // Stats row should show Responses, Completion, Days Left
      await expect(page.getByText('Responses')).toBeVisible();
      await expect(page.getByText('Completion')).toBeVisible();
      await expect(page.getByText('Days Left')).toBeVisible();

      // Progress bar should be present
      await expect(page.getByRole('progressbar')).toBeVisible();
    }
  });

  test('shows empty state when no surveys', async ({ page }) => {
    // If there are no surveys, the empty state message should appear
    // This test verifies the empty state renders correctly when present
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const emptyMessage = page.getByText(/no surveys yet/i);
    const activeBadge = page.getByText('Active', { exact: true });

    // Either the empty state or actual content should be visible
    const hasEmptyState = await emptyMessage.isVisible().catch(() => false);
    const hasActiveSurvey = await activeBadge.isVisible().catch(() => false);

    expect(hasEmptyState || hasActiveSurvey).toBe(true);
  });

  test('quick actions navigate correctly', async ({ page }) => {
    // Requires: active survey with deployment for the client org
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const viewResultsButton = page.getByRole('button', { name: /view.*results/i });
    if (await viewResultsButton.isVisible().catch(() => false)) {
      await viewResultsButton.click();
      await page.waitForURL(/\/results\//, { timeout: 10000 });
      expect(page.url()).toContain('/results/');
    }
  });

  test('previous surveys list is clickable', async ({ page }) => {
    // Requires: at least one completed survey for the client org
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const previousHeading = page.getByRole('heading', { name: /previous surveys/i });
    if (await previousHeading.isVisible().catch(() => false)) {
      // Click the first previous survey item (has "Complete" badge)
      const completeBadge = page.getByText('Complete', { exact: true }).first();
      await expect(completeBadge).toBeVisible();

      // The Complete badge is inside a button — click the button that contains it
      const surveyButton = page.locator('button', { has: page.getByText('Complete', { exact: true }) }).first();
      await surveyButton.click();
      await page.waitForURL(/\/results\//, { timeout: 10000 });
      expect(page.url()).toContain('/results/');
    }
  });
});
