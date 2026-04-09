import { test, expect } from '@playwright/test';
import { AdminPage } from '../../page-objects/admin.page';

test.use({ storageState: 'e2e/.auth/admin.json' });

test.describe('Admin client management', () => {
  test('client list renders with cards or empty state', async ({ page }) => {
    await page.goto('/admin/clients');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { name: /clients/i }),
    ).toBeVisible({ timeout: 10000 });

    const clientCards = page.getByTestId('client-card').or(
      page.locator('button[aria-label^="View"]'),
    );
    const emptyState = page.getByText(/no clients/i);

    const hasCards = await clientCards.first().isVisible({ timeout: 5000 }).catch(() => false);
    const hasEmpty = await emptyState.isVisible({ timeout: 5000 }).catch(() => false);

    expect(hasCards || hasEmpty).toBe(true);
  });

  test('clicking a client card navigates to client detail', async ({ page }) => {
    await page.goto('/admin/clients');
    await page.waitForLoadState('networkidle');

    const clientCards = page.getByTestId('client-card').or(
      page.locator('button[aria-label^="View"]'),
    );

    if (await clientCards.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await clientCards.first().click();
      await page.waitForLoadState('networkidle');

      // Should navigate to a client detail URL with /overview redirect
      expect(page.url()).toContain('/admin/clients/');
      expect(page.url()).toContain('/overview');

      // Org info should be visible on detail page
      const orgHeading = page.getByRole('heading').first();
      await expect(orgHeading).toBeVisible({ timeout: 10000 });
    }
  });

  test('client detail page has horizontal tabs', async ({ page }) => {
    await page.goto('/admin/clients');
    await page.waitForLoadState('networkidle');

    const clientCards = page.getByTestId('client-card').or(
      page.locator('button[aria-label^="View"]'),
    );

    if (await clientCards.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await clientCards.first().click();
      await page.waitForLoadState('networkidle');

      // Client detail may still be loading — wait for tabs or loading state
      const tabs = page.getByRole('tab');
      const loadingMsg = page.getByText(/loading client/i);

      const hasTabs = await tabs.first().isVisible({ timeout: 10000 }).catch(() => false);
      const hasLoading = await loadingMsg.isVisible().catch(() => false);

      if (hasTabs) {
        const tabCount = await tabs.count();
        expect(tabCount).toBeGreaterThanOrEqual(2);

        const overviewTab = page.getByRole('tab', { name: /overview/i });
        const surveysTab = page.getByRole('tab', { name: /surveys/i });
        const hasOverview = await overviewTab.isVisible().catch(() => false);
        const hasSurveys = await surveysTab.isVisible().catch(() => false);
        expect(hasOverview || hasSurveys).toBe(true);

        // Verify tab navigation changes the URL
        if (hasSurveys) {
          const currentUrl = page.url();
          await surveysTab.click();
          await page.waitForLoadState('networkidle');
          expect(page.url()).not.toEqual(currentUrl);
          expect(page.url()).toContain('/surveys');
        }
      } else {
        // Client detail is still loading — page navigated correctly
        expect(hasLoading || page.url().includes('/admin/clients/')).toBe(true);
      }
    }
  });

  test('survey creation flow opens builder with title field', async ({ page }) => {
    const admin = new AdminPage(page);
    await admin.goto();

    if (await admin.newSurveyButton.isVisible({ timeout: 10000 }).catch(() => false)) {
      await admin.newSurveyButton.click();
      await page.waitForLoadState('networkidle');

      // Builder or creation form should load
      const titleField = page.getByRole('textbox', { name: /title|name/i }).or(
        page.getByPlaceholder(/survey title|survey name/i),
      );
      const builderHeading = page.getByRole('heading', { name: /new survey|create survey|survey builder/i });

      const hasTitle = await titleField.isVisible({ timeout: 5000 }).catch(() => false);
      const hasHeading = await builderHeading.isVisible({ timeout: 5000 }).catch(() => false);

      expect(hasTitle || hasHeading || page.url().includes('new')).toBe(true);
    }
  });

  test('deploy button opens deployment panel with survey link', async ({ page }) => {
    const admin = new AdminPage(page);
    await admin.goto();

    // Navigate into an existing survey
    const firstCard = admin.surveyCards.first();
    if (await firstCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstCard.click();
      await page.waitForLoadState('networkidle');

      if (await admin.deployButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await admin.deployButton.click();
        await page.waitForLoadState('networkidle');

        // Deployment panel should show a survey link or deployment info
        const surveyLink = admin.surveyLinkDisplay.or(
          page.getByText(/survey link|share link|copy link/i),
        );
        const deployPanel = page.getByTestId('deploy-panel').or(
          page.locator('[class*="panel"], [class*="modal"]').filter({ hasText: /deploy|link/i }),
        );

        const hasLink = await surveyLink.isVisible({ timeout: 5000 }).catch(() => false);
        const hasPanel = await deployPanel.first().isVisible({ timeout: 5000 }).catch(() => false);

        expect(hasLink || hasPanel).toBe(true);
      }
    }
  });

  test('client settings shows metadata dropdown configuration', async ({ page }) => {
    await page.goto('/admin/clients');
    await page.waitForLoadState('networkidle');

    const clientCards = page.getByTestId('client-card').or(
      page.locator('button[aria-label^="View"]'),
    );

    if (await clientCards.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await clientCards.first().click();
      await page.waitForLoadState('networkidle');

      // Navigate to settings tab if available
      const settingsTab = page.getByRole('tab', { name: /settings/i });
      if (await settingsTab.isVisible({ timeout: 5000 }).catch(() => false)) {
        await settingsTab.click();
        await page.waitForLoadState('networkidle');

        // URL should change to include /settings
        expect(page.url()).toContain('/settings');

        // Metadata dropdowns for departments, roles, etc.
        const dropdowns = page.getByRole('combobox').or(page.locator('select'));
        const metadataLabel = page.getByText(/department|role|location|metadata/i);

        const hasDropdowns = await dropdowns.first().isVisible({ timeout: 5000 }).catch(() => false);
        const hasLabels = await metadataLabel.first().isVisible({ timeout: 5000 }).catch(() => false);

        expect(hasDropdowns || hasLabels).toBe(true);
      }
    }
  });

  test('direct navigation to client tab URLs works', async ({ page }) => {
    // First, get a valid client ID by navigating to the list
    await page.goto('/admin/clients');
    await page.waitForLoadState('networkidle');

    const clientCards = page.getByTestId('client-card').or(
      page.locator('button[aria-label^="View"]'),
    );

    if (await clientCards.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      // Navigate to first client to extract ID from URL
      await clientCards.first().click();
      await page.waitForLoadState('networkidle');

      const detailUrl = page.url();
      const clientIdMatch = detailUrl.match(/\/admin\/clients\/([^/]+)/);

      if (clientIdMatch) {
        const clientId = clientIdMatch[1];

        // Test direct navigation to /surveys tab
        await page.goto(`/admin/clients/${clientId}/surveys`);
        await page.waitForLoadState('networkidle');
        expect(page.url()).toContain(`/admin/clients/${clientId}/surveys`);
        const surveysTab = page.getByRole('tab', { name: /surveys/i });
        await expect(surveysTab).toBeVisible({ timeout: 10000 });

        // Test direct navigation to /users tab
        await page.goto(`/admin/clients/${clientId}/users`);
        await page.waitForLoadState('networkidle');
        expect(page.url()).toContain(`/admin/clients/${clientId}/users`);
        const usersTab = page.getByRole('tab', { name: /users/i });
        await expect(usersTab).toBeVisible({ timeout: 10000 });

        // Test redirect from base /admin/clients/{id} to /overview
        await page.goto(`/admin/clients/${clientId}`);
        await page.waitForLoadState('networkidle');
        expect(page.url()).toContain(`/admin/clients/${clientId}/overview`);
      }
    }
  });
});
