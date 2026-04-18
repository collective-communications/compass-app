import { test, expect } from '@playwright/test';
import { createAdminClient } from '../../helpers/db';
import { SEED_SURVEY_ID, SEED_ORG_ID } from '../../helpers/survey';
import { deleteAllReports, seedCompletedReport } from '../../helpers/reports';

/**
 * Report list E2E tests.
 *
 * All tier_2 tests require client_access_enabled = true on the client org
 * to reach the reports page. Each describe block sets state explicitly
 * via beforeAll so tests are deterministic.
 *
 * Fixture strategy:
 *   - `empty state` tests: `deleteAllReports(surveyId)` in beforeEach, then
 *     assert the "no reports yet" copy is visible AND the list is NOT.
 *   - `populated` tests: `seedCompletedReport(surveyId)` in beforeEach, then
 *     assert the list IS visible AND the empty-state copy is NOT.
 *
 * There are no `if (await x.isVisible()) …` escape hatches — every test
 * asserts a single definitive outcome.
 */

async function setClientAccess(enabled: boolean): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from('organizations')
    .update({ client_access_enabled: enabled })
    .eq('id', SEED_ORG_ID);
  await supabase
    .from('organization_settings')
    .update({ client_access_enabled: enabled })
    .eq('organization_id', SEED_ORG_ID);
}

// ─── client_exec — empty state ─────────────────────────────────────────────

test.describe('Report list page — client_exec, empty state', () => {
  test.use({ storageState: 'e2e/.auth/client.json' });

  test.beforeAll(async () => {
    await setClientAccess(true);
  });

  test.beforeEach(async () => {
    await deleteAllReports(SEED_SURVEY_ID);
  });

  test('client_exec sees empty-state copy when no reports exist', async ({ page }) => {
    await page.goto(`/reports/${SEED_SURVEY_ID}`);
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/reports');

    const emptyMessage = page.getByText(/no reports yet/i);
    const reportList = page.getByRole('list', { name: /available reports|previous survey/i });

    await expect(emptyMessage).toBeVisible({ timeout: 10000 });
    await expect(reportList).toHaveCount(0);
  });

  test('client_exec sees Generate Report button (empty state)', async ({ page }) => {
    await page.goto(`/reports/${SEED_SURVEY_ID}`);
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/reports');
    await expect(
      page.getByRole('button', { name: /generate report/i }).first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test('client_exec can open generate modal and select sections', async ({ page }) => {
    await page.goto(`/reports/${SEED_SURVEY_ID}`);
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/reports');

    const generateButton = page.getByRole('button', { name: /generate report/i }).first();
    await expect(generateButton).toBeVisible({ timeout: 10000 });
    await generateButton.click();

    // Modal appears and is focus-trapped
    const modal = page.getByRole('dialog', { name: /export report/i });
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Configure panel has at least one section checkbox
    const checkboxes = modal.getByRole('checkbox');
    await expect(checkboxes.first()).toBeVisible({ timeout: 3000 });
    const checkboxCount = await checkboxes.count();
    expect(checkboxCount).toBeGreaterThan(0);

    // Footer has the in-modal "Generate Report" confirm button
    const confirmButton = modal.getByRole('button', { name: /generate report/i });
    await expect(confirmButton).toBeVisible();
  });
});

// ─── client_exec — populated state ─────────────────────────────────────────

test.describe('Report list page — client_exec, populated', () => {
  test.use({ storageState: 'e2e/.auth/client.json' });

  test.beforeAll(async () => {
    await setClientAccess(true);
  });

  test.beforeEach(async () => {
    await deleteAllReports(SEED_SURVEY_ID);
    await seedCompletedReport(SEED_SURVEY_ID, 'pdf');
  });

  test('client_exec sees the report list (not empty-state copy)', async ({ page }) => {
    await page.goto(`/reports/${SEED_SURVEY_ID}`);
    await page.waitForLoadState('networkidle');

    const reportList = page.getByRole('list', { name: /available reports|previous survey/i }).first();
    await expect(reportList).toBeVisible({ timeout: 10000 });

    const emptyMessage = page.getByText(/no reports yet/i);
    await expect(emptyMessage).toHaveCount(0);
  });

  test('report card shows format badge and date', async ({ page }) => {
    await page.goto(`/reports/${SEED_SURVEY_ID}`);
    await page.waitForLoadState('networkidle');

    const reportList = page.getByRole('list', { name: /available reports|previous survey/i }).first();
    await expect(reportList).toBeVisible({ timeout: 10000 });

    const firstItem = reportList.getByRole('listitem').first();
    await expect(firstItem).toBeVisible();

    const formatBadge = firstItem.locator('span').filter({ hasText: /pdf|docx|pptx/i }).first();
    await expect(formatBadge).toBeVisible();
  });

  test('selecting a report marks the card as current (aria-current=true)', async ({ page }) => {
    await page.goto(`/reports/${SEED_SURVEY_ID}`);
    await page.waitForLoadState('networkidle');

    const reportList = page.getByRole('list', { name: /available reports|previous survey/i }).first();
    await expect(reportList).toBeVisible({ timeout: 10000 });

    // Each report card is a role="group" with a stretched click overlay button.
    const card = reportList.getByRole('group').first();
    const clickOverlay = card.getByRole('button', { name: /select report/i });
    await clickOverlay.click();

    await expect(card).toHaveAttribute('aria-current', 'true');
  });
});

// ─── Admin ──────────────────────────────────────────────────────────────────

test.describe('Report list page — admin generate access', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' });

  test.beforeEach(async () => {
    await deleteAllReports(SEED_SURVEY_ID);
  });

  test('admin sees Generate Report button', async ({ page }) => {
    await page.goto(`/reports/${SEED_SURVEY_ID}`);
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('button', { name: /generate report/i }).first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test('admin sees empty-state copy with no reports seeded', async ({ page }) => {
    await page.goto(`/reports/${SEED_SURVEY_ID}`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/no reports yet/i)).toBeVisible({ timeout: 10000 });
  });
});

// ─── Director ───────────────────────────────────────────────────────────────

test.describe('Report list page — director role', () => {
  test.use({ storageState: 'e2e/.auth/director.json' });

  test.beforeAll(async () => {
    await setClientAccess(true);
  });

  test.beforeEach(async () => {
    await deleteAllReports(SEED_SURVEY_ID);
  });

  test('director does NOT see Generate Report button', async ({ page }) => {
    await page.goto(`/reports/${SEED_SURVEY_ID}`);
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/reports');

    // The page-level Generate Report button is role-gated to client_exec only.
    // The ExportModal also contains a "Generate Report" button but is hidden
    // (visibility: hidden) when closed. Use .first() to target the page button.
    const generateButton = page.getByRole('button', { name: /generate report|new export/i }).first();
    await expect(generateButton).not.toBeVisible({ timeout: 5000 });
  });

  test('director sees empty-state copy when no reports exist', async ({ page }) => {
    await page.goto(`/reports/${SEED_SURVEY_ID}`);
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/reports');
    await expect(page.getByText(/no reports yet/i)).toBeVisible({ timeout: 10000 });
  });
});

// ─── Manager ────────────────────────────────────────────────────────────────

test.describe('Report list page — manager role', () => {
  test.use({ storageState: 'e2e/.auth/manager.json' });

  test.beforeAll(async () => {
    await setClientAccess(true);
  });

  test.beforeEach(async () => {
    await deleteAllReports(SEED_SURVEY_ID);
  });

  test('manager does NOT see Generate Report button', async ({ page }) => {
    await page.goto(`/reports/${SEED_SURVEY_ID}`);
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/reports');

    const generateButton = page.getByRole('button', { name: /generate report|new export/i }).first();
    await expect(generateButton).not.toBeVisible({ timeout: 5000 });
  });

  test('manager sees empty-state copy when no reports exist', async ({ page }) => {
    await page.goto(`/reports/${SEED_SURVEY_ID}`);
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/reports');
    await expect(page.getByText(/no reports yet/i)).toBeVisible({ timeout: 10000 });
  });
});
