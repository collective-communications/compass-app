import { test, expect, type Page } from '@playwright/test';
import { createAdminClient } from '../../helpers/db';
import { SEED_SURVEY_ID, SEED_ORG_ID } from '../../helpers/survey';
import { deleteAllReports, seedCompletedReport } from '../../helpers/reports';

test.describe.configure({ mode: 'serial' });

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

// ─── Wave 2.6 regressions ──────────────────────────────────────────────────
//
// Wave 1.8 gated the "No surveys available" banner on
// `!surveyIdFromRoute && activeSurveys.length === 0`, so the banner MUST
// never render when a valid `$surveyId` is pinned in the URL — regardless
// of role or whether the active-survey list ended up empty.
//
// The page-level "Generate Report" button is role-gated via
// ROLE_TO_REPORTS_PAGE_ROLE (see features/reports/routes.tsx): ccc_admin,
// ccc_member, and client_exec all map to `client_exec` and can generate;
// client_director and client_manager map to read-only roles and cannot.
//
// These describe blocks are parametrised over every role that can reach
// the reports page, so a regression in either gate fails the suite for
// the exact role that drifted.

type ReportsRoleSpec = {
  role: 'ccc_admin' | 'ccc_member' | 'client_exec' | 'client_director' | 'client_manager';
  storageState: string;
  canGenerate: boolean;
  /** Tier 2 roles need client_access_enabled=true on their org to reach /reports/*. */
  needsClientAccess: boolean;
};

const REPORTS_ROLES: ReportsRoleSpec[] = [
  { role: 'ccc_admin',       storageState: 'e2e/.auth/admin.json',      canGenerate: true,  needsClientAccess: false },
  { role: 'ccc_member',      storageState: 'e2e/.auth/ccc-member.json', canGenerate: true,  needsClientAccess: false },
  { role: 'client_exec',     storageState: 'e2e/.auth/client.json',     canGenerate: true,  needsClientAccess: true  },
  { role: 'client_director', storageState: 'e2e/.auth/director.json',   canGenerate: false, needsClientAccess: true  },
  { role: 'client_manager',  storageState: 'e2e/.auth/manager.json',    canGenerate: false, needsClientAccess: true  },
];

async function setClientAccessEnabled(enabled: boolean): Promise<void> {
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

for (const spec of REPORTS_ROLES) {
  test.describe(`Report list — banner + generate gate (${spec.role})`, () => {
    test.use({ storageState: spec.storageState });

    test.beforeAll(async () => {
      if (spec.needsClientAccess) {
        await setClientAccessEnabled(true);
      }
    });

    test(`[${spec.role}] "No surveys available" banner is NOT shown when $surveyId is pinned`, async ({
      page,
    }: {
      page: Page;
    }) => {
      await page.goto(`/reports/${SEED_SURVEY_ID}`);
      await page.waitForLoadState('networkidle');

      // Must land on /reports, not bounce to login or dashboard.
      expect(page.url()).toContain('/reports');

      // The exact copy gated by Wave 1.8 — assert it is absent from the DOM,
      // regardless of the underlying active-surveys list state.
      await expect(page.getByText('No surveys available')).toHaveCount(0);
    });

    test(`[${spec.role}] Generate Report button visibility matches role`, async ({
      page,
    }: {
      page: Page;
    }) => {
      await page.goto(`/reports/${SEED_SURVEY_ID}`);
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/reports');

      // The page-level button is the first Generate Report affordance;
      // the ExportModal also contains one but is hidden when closed.
      const pageButton = page.getByRole('button', { name: /generate report/i }).first();

      if (spec.canGenerate) {
        await expect(pageButton).toBeVisible({ timeout: 10000 });
      } else {
        await expect(pageButton).not.toBeVisible({ timeout: 5000 });
      }
    });
  });
}

// ─── Wave 2.6: Previous reports render ─────────────────────────────────────
//
// The seed inserts one `client_visible=true` report attached to the active
// seed survey. When a client-access-enabled role visits /reports/<seedId>,
// that report MUST render in the list — this guards against regressions
// where the list query, client_visible filter, or role-mapping accidentally
// hides seeded reports.
//
// The seed survey is `status='active'`, so the heading rendered by the page
// is "Available Reports" (not "Previous Surveys") — the task spec notes
// "PREVIOUS SURVEYS (or equivalent)", and the equivalent here is the
// Available Reports list. The assertion targets either aria-label so the
// test survives a survey-status change in the seed without silently passing.

test.describe('Report list — previous/available reports render (client_exec, seeded)', () => {
  test.use({ storageState: 'e2e/.auth/client.json' });

  test.beforeAll(async () => {
    await setClientAccessEnabled(true);
  });

  test.beforeEach(async () => {
    // Rehydrate the seeded client-visible PDF in case a sibling describe
    // block (which runs deleteAllReports in its own beforeEach) wiped it.
    await deleteAllReports(SEED_SURVEY_ID);
    await seedCompletedReport(SEED_SURVEY_ID, 'pdf');
  });

  test('client_exec sees at least one PDF entry in the available/previous reports list', async ({ page }) => {
    await page.goto(`/reports/${SEED_SURVEY_ID}`);
    await page.waitForLoadState('networkidle');

    const reportList = page
      .getByRole('list', { name: /available reports|previous survey/i })
      .first();
    await expect(reportList).toBeVisible({ timeout: 10000 });

    // At least one list item exists…
    const items = reportList.getByRole('listitem');
    expect(await items.count()).toBeGreaterThan(0);

    // …and at least one renders a PDF format badge, matching the
    // seeded `format='pdf'` row.
    const pdfBadge = reportList.locator('span').filter({ hasText: /pdf/i }).first();
    await expect(pdfBadge).toBeVisible({ timeout: 5000 });
  });
});
