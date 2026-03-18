import { test, expect } from '@playwright/test';
import { THEMES, storyUrl, waitForStoryReady } from './helpers';

test.describe('Card component', () => {
  for (const theme of THEMES) {
    test(`default - ${theme}`, async ({ page }) => {
      await page.goto(storyUrl('components-ui-card--default', theme));
      await waitForStoryReady(page);
      await expect(page).toHaveScreenshot(`card-default--${theme}.png`);
    });

    test(`all severities - ${theme}`, async ({ page }) => {
      await page.goto(storyUrl('components-ui-card--all-severities', theme));
      await waitForStoryReady(page);
      await expect(page).toHaveScreenshot(`card-all-severities--${theme}.png`);
    });
  }
});
