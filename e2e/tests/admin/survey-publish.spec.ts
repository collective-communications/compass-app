import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/admin.json' });

const SURVEY_ID = '00000000-0000-0000-0000-000000000100';

test.describe('Publish page — deployment label regression guard', () => {
  test('seeded active survey renders "Published Survey" panel with a days-remaining badge, not "Expired"', async ({ page }) => {
    await page.goto(`/surveys/${SURVEY_ID}/publish`);

    // Scope to the DeploymentPanel card — the closest card-like div containing
    // the "Published Survey" heading. Using the heading as an `has` anchor and
    // walking up to the panel container via `.first()` keeps us tied to the
    // component even if sibling cards (e.g. ResponseTracker) share class shapes.
    const panel = page.locator('div', {
      has: page.getByRole('heading', { name: /published survey/i }),
    }).first();

    await expect(panel).toBeVisible();

    // Negative — must not say "Expired" (regression: daysRemaining === 0 path)
    await expect(panel).not.toContainText(/Expired/);

    // Positive — must show "Nd remaining" (active deployment from seed)
    await expect(panel.getByText(/\d+d remaining/i)).toBeVisible();

    // Deployment URL present with copy affordance
    await expect(panel.getByText(/\/s\//).first()).toBeVisible();
    await expect(panel.getByRole('button', { name: /copy/i }).first()).toBeVisible();

    // Opens / Closes dates visible — loose match
    await expect(panel.getByText(/(opens|closes)/i).first()).toBeVisible();
  });
});
