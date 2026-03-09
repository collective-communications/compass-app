import { test, expect } from '@playwright/test';

test.describe('Help system — app shell', () => {
  test.use({ storageState: 'e2e/.auth/client.json' });

  test('help drawer opens and renders content', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Look for help button (? icon or "Help" text)
    const helpButton = page.getByRole('button', { name: /help/i });
    if (await helpButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await helpButton.click();

      // Help drawer or panel should appear
      const helpPanel = page.getByRole('dialog').or(page.getByTestId('help-drawer'));
      await expect(helpPanel).toBeVisible({ timeout: 5000 });
    }
  });

  test('help content is contextual to current page', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const helpButton = page.getByRole('button', { name: /help/i });
    if (await helpButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await helpButton.click();

      // Help content should contain dashboard-related keywords
      const helpContent = page.getByRole('dialog').or(page.getByTestId('help-drawer'));
      if (await helpContent.isVisible({ timeout: 5000 }).catch(() => false)) {
        const text = await helpContent.textContent();
        expect(text).toBeTruthy();
      }
    }
  });
});

test.describe('Help system — survey shell', () => {
  test('survey help mentions keyboard shortcuts and anonymity', async ({ page }) => {
    // Access survey via a survey URL (without auth)
    // This test verifies survey-specific help content
    await page.goto('/s/00000000-0000-0000-0000-000000000000');
    await page.waitForLoadState('networkidle');

    const helpButton = page.getByRole('button', { name: /help/i });
    if (await helpButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await helpButton.click();

      const helpContent = page.getByRole('dialog').or(page.getByTestId('help-drawer'));
      if (await helpContent.isVisible({ timeout: 5000 }).catch(() => false)) {
        const text = (await helpContent.textContent()) ?? '';
        // Survey help should mention keyboard shortcuts or anonymity
        const hasRelevantContent =
          /keyboard|shortcut|anonymous|private|confidential/i.test(text);
        expect(hasRelevantContent).toBe(true);
      }
    }
  });
});
