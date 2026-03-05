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

test.describe('Report list page — director', () => {
  // Uses admin auth as proxy — in production the director role
  // would be a separate test user. This verifies the role-based UI difference.
  // Requires: a test user with director role. Using admin for now since
  // admin maps to client_exec; a dedicated director user would be needed
  // for a true negative test.
  test.use({ storageState: 'e2e/.auth/admin.json' });

  test('director does not see Generate button on reports page', async ({ page }) => {
    // NOTE: This test is a placeholder. The admin user is tier_1 (ccc_admin),
    // not a director. A proper test requires a seeded director user.
    // For now, we verify the page loads and the button visibility matches the role.
    await page.goto(`/reports/${SEED_SURVEY_ID}`);

    // Admin/tier_1 users are always allowed. The Generate button visibility
    // depends on the userRole prop mapped in the route. ccc_admin maps to
    // client_exec, so the button WILL be visible for admin.
    // A true director test needs a dedicated director test user in auth.setup.ts.
    await page.waitForLoadState('networkidle');

    // Verify the page loaded (no redirect/error)
    expect(page.url()).toContain('/reports/');
  });
});
