import { test, expect } from '@playwright/test';
import { AdminPage } from '../../page-objects/admin.page';
import { SEED_ORG_ID } from '../../helpers/survey';

test.use({ storageState: 'e2e/.auth/admin.json' });

/**
 * Admin client management E2E tests.
 *
 * The seed fixture (scripts/seed-dev.ts) always provisions at least one
 * client organization and one active survey, so the tests below assert
 * unconditionally instead of wrapping each step in `if (isVisible())`
 * guards that silently skip. Matches the fixture-deterministic style
 * from `e2e/tests/reports/report-list.spec.ts`.
 *
 * Tests that require a specific survey or settings affordance navigate
 * directly to the seeded org's detail route (SEED_ORG_ID) rather than
 * relying on the first card, which is alphabetically ordered and may
 * resolve to an unrelated client left over from prior test runs on the
 * shared remote E2E database.
 */

const clientCardLocator = (page: import('@playwright/test').Page) =>
  page.getByTestId('client-card').or(page.locator('button[aria-label^="View"]'));

test.describe('Admin client management', () => {
  test('client list renders with at least one seeded client card', async ({ page }) => {
    await page.goto('/clients');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { name: /clients/i }),
    ).toBeVisible({ timeout: 10000 });

    // Seed guarantees at least one client org — no empty-state fallback.
    await expect(clientCardLocator(page).first()).toBeVisible({ timeout: 10000 });
  });

  test('clicking a client card navigates to client detail', async ({ page }) => {
    await page.goto('/clients');
    await page.waitForLoadState('networkidle');

    const firstCard = clientCardLocator(page).first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });
    await firstCard.click();
    await page.waitForLoadState('networkidle');

    // Should navigate to a client detail URL with /overview redirect
    expect(page.url()).toContain('/clients/');
    expect(page.url()).toContain('/overview');

    // Org info should be visible on detail page
    const orgHeading = page.getByRole('heading').first();
    await expect(orgHeading).toBeVisible({ timeout: 10000 });
  });

  test('client detail page has horizontal tabs', async ({ page }) => {
    await page.goto('/clients');
    await page.waitForLoadState('networkidle');

    await clientCardLocator(page).first().click();
    await page.waitForLoadState('networkidle');

    const tabs = page.getByRole('tab');
    await expect(tabs.first()).toBeVisible({ timeout: 10000 });

    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThanOrEqual(2);

    // Overview + Surveys tabs are both part of the client detail shell.
    const overviewTab = page.getByRole('tab', { name: /overview/i });
    const surveysTab = page.getByRole('tab', { name: /surveys/i });
    await expect(overviewTab).toBeVisible();
    await expect(surveysTab).toBeVisible();

    // Clicking the Surveys tab updates the URL.
    const currentUrl = page.url();
    await surveysTab.click();
    await page.waitForLoadState('networkidle');
    expect(page.url()).not.toEqual(currentUrl);
    expect(page.url()).toContain('/surveys');
  });

  test('survey creation button is available on the client-detail surveys tab', async ({ page }) => {
    await page.goto('/clients');
    await page.waitForLoadState('networkidle');

    await clientCardLocator(page).first().click();
    await page.waitForLoadState('networkidle');

    // Navigate to the Surveys tab — that's where the "New Survey" CTA lives.
    const surveysTab = page.getByRole('tab', { name: /surveys/i });
    await expect(surveysTab).toBeVisible({ timeout: 10000 });
    await surveysTab.click();
    await page.waitForLoadState('networkidle');

    const admin = new AdminPage(page);
    await expect(admin.newSurveyButton).toBeVisible({ timeout: 10000 });
  });

  test('deploy affordance surfaces when configuring a seeded survey', async ({ page }) => {
    // Navigate directly to the seeded org's Surveys tab so we always land
    // on the client that has an active survey (seed-dev.ts provisions it).
    // The first alphabetical card can be a different org left over from
    // prior runs on the shared remote DB, which has no surveys.
    await page.goto(`/clients/${SEED_ORG_ID}/surveys`);
    await page.waitForLoadState('networkidle');

    const admin = new AdminPage(page);
    await expect(admin.surveyCards.first()).toBeVisible({ timeout: 10000 });

    // Open the survey config modal via the per-card "Configure" affordance.
    // That modal is where the Publish (deploy) button lives — the builder
    // page itself only exposes Save/Done actions.
    const configureButton = page.getByRole('button', { name: /configure survey/i }).first();
    await expect(configureButton).toBeVisible({ timeout: 10000 });
    await configureButton.click();

    await expect(admin.deployButton).toBeVisible({ timeout: 10000 });
  });

  test('client settings page shows metadata dropdown configuration', async ({ page }) => {
    // Client settings is a standalone route (/clients/$orgId/settings), not a
    // child of the client-detail tab layout, so navigate directly rather than
    // hunting for a "Settings" tab that doesn't exist in the current shell.
    await page.goto(`/clients/${SEED_ORG_ID}/settings`);
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/settings');

    // Metadata config sections render Departments / Roles / Locations labels
    // from the seeded organization_settings row.
    const metadataLabel = page.getByText(/department|role|location|metadata/i).first();
    await expect(metadataLabel).toBeVisible({ timeout: 10000 });
  });

  test('direct navigation to client tab URLs works', async ({ page }) => {
    // First, get a valid client ID by navigating to the list
    await page.goto('/clients');
    await page.waitForLoadState('networkidle');

    const firstCard = clientCardLocator(page).first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });

    // Navigate to first client to extract ID from URL
    await firstCard.click();
    await page.waitForLoadState('networkidle');

    const detailUrl = page.url();
    const clientIdMatch = detailUrl.match(/\/clients\/([^/]+)/);
    expect(clientIdMatch).not.toBeNull();
    const clientId = clientIdMatch![1];

    // Test direct navigation to /surveys tab
    await page.goto(`/clients/${clientId}/surveys`);
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain(`/clients/${clientId}/surveys`);
    const surveysTab = page.getByRole('tab', { name: /surveys/i });
    await expect(surveysTab).toBeVisible({ timeout: 10000 });

    // Test direct navigation to /users tab
    await page.goto(`/clients/${clientId}/users`);
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain(`/clients/${clientId}/users`);
    const usersTab = page.getByRole('tab', { name: /users/i });
    await expect(usersTab).toBeVisible({ timeout: 10000 });

    // Test redirect from base /clients/{id} to /overview
    await page.goto(`/clients/${clientId}`);
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain(`/clients/${clientId}/overview`);
  });
});
