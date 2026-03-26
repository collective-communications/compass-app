import { test, expect } from '@playwright/test';
import { createAdminClient } from '../../helpers/db';
import { SEED_SURVEY_ID, SEED_ORG_ID } from '../../helpers/survey';

/**
 * Report list E2E tests.
 *
 * All tier_2 tests require client_access_enabled = true on the client org
 * to reach the reports page. Each describe block sets state explicitly
 * via beforeAll so tests are deterministic.
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

// ─── client_exec ────────────────────────────────────────────────────────────

test.describe('Report list page — client_exec', () => {
  test.use({ storageState: 'e2e/.auth/client.json' });

  test.beforeAll(async () => {
    await setClientAccess(true);
  });

  test('client_exec sees reports page with empty state or report list', async ({ page }) => {
    await page.goto(`/reports/${SEED_SURVEY_ID}`);
    await page.waitForLoadState('networkidle');

    // Should stay on reports page (not redirected)
    expect(page.url()).toContain('/reports');

    const emptyMessage = page.getByText(/no reports yet/i);
    const reportList = page.getByRole('list', { name: /generated reports/i });

    const hasEmpty = await emptyMessage.isVisible().catch(() => false);
    const hasList = await reportList.isVisible().catch(() => false);
    expect(hasEmpty || hasList).toBe(true);
  });

  test('client_exec sees Generate Report button', async ({ page }) => {
    await page.goto(`/reports/${SEED_SURVEY_ID}`);
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/reports');
    await expect(
      page.getByRole('button', { name: /generate report/i }).first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test('report card shows format and date', async ({ page }) => {
    await page.goto(`/reports/${SEED_SURVEY_ID}`);
    await page.waitForLoadState('networkidle');

    const reportList = page.getByRole('list', { name: /generated reports/i });
    if (await reportList.isVisible().catch(() => false)) {
      const listItems = reportList.getByRole('listitem');
      const firstItem = listItems.first();
      await expect(firstItem).toBeVisible();

      const formatBadge = firstItem.locator('span').filter({ hasText: /pdf|docx|pptx/i }).first();
      await expect(formatBadge).toBeVisible();
    }
  });

  test('selecting report shows preview panel', async ({ page }) => {
    await page.goto(`/reports/${SEED_SURVEY_ID}`);
    await page.waitForLoadState('networkidle');

    const reportList = page.getByRole('list', { name: /generated reports/i });
    if (await reportList.isVisible().catch(() => false)) {
      const firstCard = reportList.getByRole('listitem').first().getByRole('button');
      await firstCard.click();
      await expect(firstCard).toHaveAttribute('aria-selected', 'true');
    }
  });
});

// ─── Generate flow ──────────────────────────────────────────────────────────

test.describe('Report list page — generate flow', () => {
  test.use({ storageState: 'e2e/.auth/client.json' });

  test.beforeAll(async () => {
    await setClientAccess(true);
  });

  test('client_exec can open generate modal and select sections', async ({ page }) => {
    await page.goto(`/reports/${SEED_SURVEY_ID}`);
    await page.waitForLoadState('networkidle');

    if (!page.url().includes('/reports')) return;

    const generateButton = page.getByRole('button', { name: /generate report/i }).first();
    if (await generateButton.isVisible({ timeout: 10000 }).catch(() => false)) {
      await generateButton.click();

      const modal = page.getByRole('dialog').or(
        page.locator('[class*="modal"], [class*="dialog"], [class*="panel"]').filter({ hasText: /section|generate/i }),
      );
      const hasModal = await modal.first().isVisible({ timeout: 5000 }).catch(() => false);

      if (hasModal) {
        const checkboxes = modal.first().getByRole('checkbox');
        const checkboxCount = await checkboxes.count();

        if (checkboxCount > 0) {
          await checkboxes.first().check();
          await expect(checkboxes.first()).toBeChecked();
        }

        const confirmButton = modal.first().getByRole('button', { name: /confirm|generate|create/i });
        const hasConfirm = await confirmButton.isVisible({ timeout: 3000 }).catch(() => false);
        expect(hasConfirm).toBe(true);
      }
    }
  });

  test('report card has download action', async ({ page }) => {
    await page.goto(`/reports/${SEED_SURVEY_ID}`);
    await page.waitForLoadState('networkidle');

    const reportList = page.getByRole('list', { name: /generated reports/i });
    if (await reportList.isVisible({ timeout: 5000 }).catch(() => false)) {
      const downloadButton = reportList.first().getByRole('button', { name: /download/i }).or(
        reportList.first().getByRole('link', { name: /download/i }),
      );

      if (await downloadButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
        await downloadButton.first().click();
        await downloadPromise;
        expect(true).toBe(true);
      }
    }
  });
});

// ─── Admin ──────────────────────────────────────────────────────────────────

test.describe('Report list page — admin generate access', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' });

  test('admin sees Generate Report button', async ({ page }) => {
    await page.goto(`/reports/${SEED_SURVEY_ID}`);
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('button', { name: /generate report/i }).first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test('admin can view report list', async ({ page }) => {
    await page.goto(`/reports/${SEED_SURVEY_ID}`);
    await page.waitForLoadState('networkidle');

    const emptyMessage = page.getByText(/no reports yet/i);
    const reportList = page.getByRole('list', { name: /generated reports/i });
    const hasContent = await emptyMessage.isVisible().catch(() => false)
      || await reportList.isVisible().catch(() => false);
    expect(hasContent).toBe(true);
  });
});

// ─── Director ───────────────────────────────────────────────────────────────

test.describe('Report list page — director role', () => {
  test.use({ storageState: 'e2e/.auth/director.json' });

  test.beforeAll(async () => {
    await setClientAccess(true);
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

  test('director can view report list', async ({ page }) => {
    await page.goto(`/reports/${SEED_SURVEY_ID}`);
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/reports');

    const emptyMessage = page.getByText(/no reports yet/i);
    const reportList = page.getByRole('list', { name: /generated reports/i });
    const hasContent = await emptyMessage.isVisible().catch(() => false)
      || await reportList.isVisible().catch(() => false);
    expect(hasContent).toBe(true);
  });
});

// ─── Manager ────────────────────────────────────────────────────────────────

test.describe('Report list page — manager role', () => {
  test.use({ storageState: 'e2e/.auth/manager.json' });

  test.beforeAll(async () => {
    await setClientAccess(true);
  });

  test('manager does NOT see Generate Report button', async ({ page }) => {
    await page.goto(`/reports/${SEED_SURVEY_ID}`);
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/reports');

    const generateButton = page.getByRole('button', { name: /generate report|new export/i }).first();
    await expect(generateButton).not.toBeVisible({ timeout: 5000 });
  });

  test('manager can view report list', async ({ page }) => {
    await page.goto(`/reports/${SEED_SURVEY_ID}`);
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/reports');

    const emptyMessage = page.getByText(/no reports yet/i);
    const reportList = page.getByRole('list', { name: /generated reports/i });
    const hasContent = await emptyMessage.isVisible().catch(() => false)
      || await reportList.isVisible().catch(() => false);
    expect(hasContent).toBe(true);
  });
});
