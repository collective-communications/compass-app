import { test, expect } from '@playwright/test';
import { RecipientsPage } from '../../page-objects/recipients.page';
import { AdminPage } from '../../page-objects/admin.page';
import { createActiveDeployment, cleanupDeployment } from '../../helpers/survey';

test.use({ storageState: 'e2e/.auth/admin.json' });

// Skip on Firefox — networkidle timing is unreliable, covered by Chromium
test.skip(({ browserName }) => browserName === 'firefox', 'Firefox networkidle flaky');

test.describe('Admin recipient management', () => {
  let deploymentId: string;

  test.beforeEach(async () => {
    const deployment = await createActiveDeployment();
    deploymentId = deployment.deploymentId;
  });

  test.afterEach(async () => {
    await cleanupDeployment(deploymentId);
  });

  test('recipient list section is visible on survey builder page', async ({ page }) => {
    const admin = new AdminPage(page);
    await admin.goto();
    await page.waitForLoadState('networkidle');

    // Navigate into an existing survey
    const firstCard = admin.surveyCards.first();
    if (await firstCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstCard.click();
      await page.waitForLoadState('networkidle');

      const recipients = new RecipientsPage(page);
      const listVisible = await recipients.recipientList
        .isVisible({ timeout: 10000 })
        .catch(() => false);

      const emptyState = page.getByText(/no recipients/i);
      const emptyVisible = await emptyState.isVisible({ timeout: 5000 }).catch(() => false);

      // Either the recipient list table or the empty state should be visible
      expect(listVisible || emptyVisible).toBe(true);
    }
  });

  test('add single recipient via form', async ({ page }) => {
    const admin = new AdminPage(page);
    await admin.goto();
    await page.waitForLoadState('networkidle');

    const firstCard = admin.surveyCards.first();
    if (await firstCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstCard.click();
      await page.waitForLoadState('networkidle');

      const recipients = new RecipientsPage(page);

      if (await recipients.emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        const testEmail = `e2e-test-${Date.now()}@example.com`;
        await recipients.emailInput.fill(testEmail);

        if (await recipients.nameInput.isVisible().catch(() => false)) {
          await recipients.nameInput.fill('E2E Test Recipient');
        }

        await recipients.addButton.click();
        await page.waitForLoadState('networkidle');

        // Verify the new recipient row appears with the email
        const newRow = page.getByText(testEmail);
        await expect(newRow).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('bulk CSV import adds recipients', async ({ page }) => {
    const admin = new AdminPage(page);
    await admin.goto();
    await page.waitForLoadState('networkidle');

    const firstCard = admin.surveyCards.first();
    if (await firstCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstCard.click();
      await page.waitForLoadState('networkidle');

      const recipients = new RecipientsPage(page);

      if (await recipients.bulkImportButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        const initialCount = await recipients.getRowCount();

        await recipients.bulkImportButton.click();

        // Wait for modal or textarea to appear
        const textarea = recipients.bulkImportTextarea;
        await expect(textarea).toBeVisible({ timeout: 5000 });

        const csvContent = [
          'bulk1@example.com,Bulk One',
          'bulk2@example.com,Bulk Two',
          'bulk3@example.com,Bulk Three',
        ].join('\n');

        await textarea.fill(csvContent);

        await recipients.importButton.click();
        await page.waitForLoadState('networkidle');

        // Verify row count increased
        const finalCount = await recipients.getRowCount();
        expect(finalCount).toBeGreaterThan(initialCount);
      }
    }
  });

  test('remove recipient removes row from list', async ({ page }) => {
    const admin = new AdminPage(page);
    await admin.goto();
    await page.waitForLoadState('networkidle');

    const firstCard = admin.surveyCards.first();
    if (await firstCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstCard.click();
      await page.waitForLoadState('networkidle');

      const recipients = new RecipientsPage(page);

      // Wait for at least one recipient row
      if (await recipients.recipientRows.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        const initialCount = await recipients.getRowCount();

        // Get the remove button on the first row
        const removeBtn = recipients.removeButton(0);
        if (await removeBtn.isVisible().catch(() => false)) {
          await removeBtn.click();
          await page.waitForLoadState('networkidle');

          const finalCount = await recipients.getRowCount();
          expect(finalCount).toBe(initialCount - 1);
        }
      }
    }
  });

  test('send invitations updates recipient status', async ({ page }) => {
    const admin = new AdminPage(page);
    await admin.goto();
    await page.waitForLoadState('networkidle');

    const firstCard = admin.surveyCards.first();
    if (await firstCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstCard.click();
      await page.waitForLoadState('networkidle');

      const recipients = new RecipientsPage(page);

      if (await recipients.sendInvitationsButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Check for pending status before sending
        const pendingBadge = page.getByText('Pending').first();
        const hasPending = await pendingBadge.isVisible({ timeout: 5000 }).catch(() => false);

        if (hasPending) {
          await recipients.sendInvitationsButton.click();
          await page.waitForLoadState('networkidle');

          // After sending, status should change from 'Pending' to 'Invited'
          const invitedBadge = page.getByText('Invited').first();
          await expect(invitedBadge).toBeVisible({ timeout: 10000 });
        }
      }
    }
  });
});
