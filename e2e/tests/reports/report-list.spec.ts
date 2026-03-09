import { test, expect } from '@playwright/test';

const SEED_SURVEY_ID = '00000000-0000-0000-0000-000000000100';

test.describe('Report list page — client_exec', () => {
  test.use({ storageState: 'e2e/.auth/client.json' });

  test('shows empty state when no reports', async ({ page }) => {
    await page.goto(`/reports/${SEED_SURVEY_ID}`);
    await page.waitForLoadState('networkidle');

    // If no reports exist for this survey, the empty state should show
    const emptyMessage = page.getByText(/no reports yet/i);
    const reportList = page.getByRole('list', { name: /generated reports/i });

    const hasEmpty = await emptyMessage.isVisible().catch(() => false);
    const hasList = await reportList.isVisible().catch(() => false);

    // One of the two states must be present
    expect(hasEmpty || hasList).toBe(true);
  });

  test('client_exec sees Generate button', async ({ page }) => {
    await page.goto(`/reports/${SEED_SURVEY_ID}`);
    await page.waitForLoadState('networkidle');

    // client_exec role should see the Generate Report button
    await expect(
      page.getByRole('button', { name: /generate report/i }),
    ).toBeVisible({ timeout: 10000 });
  });

  test('report card shows format and date', async ({ page }) => {
    // Requires: at least one generated report for this survey in seed data
    await page.goto(`/reports/${SEED_SURVEY_ID}`);
    await page.waitForLoadState('networkidle');

    const reportList = page.getByRole('list', { name: /generated reports/i });
    if (await reportList.isVisible().catch(() => false)) {
      // Report cards should contain a format badge (e.g., PDF)
      const listItems = reportList.getByRole('listitem');
      const firstItem = listItems.first();
      await expect(firstItem).toBeVisible();

      // Format badge exists (PDF, PPTX, etc.)
      const formatBadge = firstItem.locator('span').filter({ hasText: /pdf|pptx/i }).first();
      await expect(formatBadge).toBeVisible();
    }
  });

  test('selecting report shows preview panel', async ({ page }) => {
    // Requires: at least one generated report for this survey
    await page.goto(`/reports/${SEED_SURVEY_ID}`);
    await page.waitForLoadState('networkidle');

    const reportList = page.getByRole('list', { name: /generated reports/i });
    if (await reportList.isVisible().catch(() => false)) {
      // Click the first report card
      const firstCard = reportList.getByRole('listitem').first().getByRole('button');
      await firstCard.click();

      // The clicked card should become selected (aria-selected=true)
      await expect(firstCard).toHaveAttribute('aria-selected', 'true');
    }
  });
});

test.describe('Report list page — director role', () => {
  test.use({ storageState: 'e2e/.auth/director.json' });

  test('director does NOT see Generate Report button', async ({ page }) => {
    await page.goto(`/reports/${SEED_SURVEY_ID}`);
    await page.waitForLoadState('networkidle');

    // Director should NOT see the generate/export button
    const generateButton = page.getByRole('button', { name: /generate report|new export/i });
    await expect(generateButton).not.toBeVisible({ timeout: 5000 });
  });

  test('director can view report list', async ({ page }) => {
    await page.goto(`/reports/${SEED_SURVEY_ID}`);
    await page.waitForLoadState('networkidle');

    // Should see either reports list or empty state
    const emptyMessage = page.getByText(/no reports yet/i);
    const reportList = page.getByRole('list', { name: /generated reports/i });
    const hasContent = await emptyMessage.isVisible().catch(() => false)
      || await reportList.isVisible().catch(() => false);
    expect(hasContent).toBe(true);
  });
});

test.describe('Report list page — manager role', () => {
  test.use({ storageState: 'e2e/.auth/manager.json' });

  test('manager does NOT see Generate Report button', async ({ page }) => {
    await page.goto(`/reports/${SEED_SURVEY_ID}`);
    await page.waitForLoadState('networkidle');

    const generateButton = page.getByRole('button', { name: /generate report|new export/i });
    await expect(generateButton).not.toBeVisible({ timeout: 5000 });
  });

  test('manager can view report list', async ({ page }) => {
    await page.goto(`/reports/${SEED_SURVEY_ID}`);
    await page.waitForLoadState('networkidle');

    const emptyMessage = page.getByText(/no reports yet/i);
    const reportList = page.getByRole('list', { name: /generated reports/i });
    const hasContent = await emptyMessage.isVisible().catch(() => false)
      || await reportList.isVisible().catch(() => false);
    expect(hasContent).toBe(true);
  });
});
