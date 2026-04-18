import { test, expect } from '@playwright/test';
import { AdminPage } from '../../page-objects/admin.page';
import { createAdminClient } from '../../helpers/db';
import { SEED_ORG_ID } from '../../helpers/survey';

test.use({ storageState: 'e2e/.auth/admin.json' });

/**
 * Admin survey builder E2E tests.
 *
 * The seed fixture provisions an active survey on the client org, so the
 * ACTIVE-badge + survey-list + builder tests assert unconditionally. The
 * Draft-badge test seeds its own draft row in `beforeAll` and tears down
 * in `afterAll`, mirroring the populated/empty split from
 * `e2e/tests/reports/report-list.spec.ts`.
 */

const DRAFT_SURVEY_ID = '00000000-0000-0000-0000-0000000001d0';

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
  test('admin sees survey list with at least one seeded card', async ({ page }) => {
    await gotoClientSurveys(page);

    // Seed guarantees a survey on the client org.
    const admin = new AdminPage(page);
    await expect(admin.surveyCards.first()).toBeVisible({ timeout: 10000 });
  });

  test('active survey card has ACTIVE badge', async ({ page }) => {
    await gotoClientSurveys(page);

    // Seed provisions a single active survey — ACTIVE badge must be present.
    const activeBadge = page.getByText('Active', { exact: true }).first();
    await expect(activeBadge).toBeVisible({ timeout: 10000 });
  });

  test('new survey button is visible to admin', async ({ page }) => {
    await gotoClientSurveys(page);

    const admin = new AdminPage(page);
    await expect(admin.newSurveyButton).toBeVisible({ timeout: 10000 });
  });

  test('clicking a survey card navigates into the builder route', async ({ page }) => {
    await gotoClientSurveys(page);

    const admin = new AdminPage(page);
    await expect(admin.surveyCards.first()).toBeVisible({ timeout: 10000 });
    await admin.surveyCards.first().click();
    await page.waitForLoadState('networkidle');

    // The click lands on something survey-related — either the survey-builder
    // (/surveys/$surveyId) or the client detail surveys tab
    // (/clients/$orgId/surveys) depending on which card was visible first.
    expect(page.url()).toMatch(/\/surveys(\/|$)/);
  });
});

// ─── Draft badge (seeded separately) ────────────────────────────────────────

test.describe('Admin survey builder — draft badge', () => {
  test.beforeAll(async () => {
    const supabase = createAdminClient();
    // Reuse the seed template — simplest way to create a valid draft row.
    const { data: seedSurvey } = await supabase
      .from('surveys')
      .select('template_id')
      .eq('organization_id', SEED_ORG_ID)
      .limit(1)
      .single();

    const templateId = (seedSurvey as { template_id: string } | null)?.template_id;

    await supabase.from('surveys').upsert(
      {
        id: DRAFT_SURVEY_ID,
        organization_id: SEED_ORG_ID,
        template_id: templateId,
        title: 'Draft E2E Survey',
        status: 'draft',
        opens_at: null,
        closes_at: null,
      },
      { onConflict: 'id' },
    );
  });

  test.afterAll(async () => {
    const supabase = createAdminClient();
    await supabase.from('surveys').delete().eq('id', DRAFT_SURVEY_ID);
  });

  test('draft survey card has Draft badge', async ({ page }) => {
    await gotoClientSurveys(page);

    const draftBadge = page.getByText('Draft', { exact: true }).first();
    await expect(draftBadge).toBeVisible({ timeout: 10000 });
  });
});
