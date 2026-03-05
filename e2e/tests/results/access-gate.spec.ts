import { test, expect } from '@playwright/test';

// Prerequisite: seed survey 00000000-0000-0000-0000-000000000100 must exist.
// The client org (00000000-0000-0000-0000-000000000002) owns this survey.
// client_access_enabled on the survey controls whether client users can view results.
const SEED_SURVEY_ID = '00000000-0000-0000-0000-000000000100';

test.describe('Results access gate — client user blocked', () => {
  test.use({ storageState: 'e2e/.auth/client.json' });

  // Prerequisite: client_access_enabled = false on the seed survey.
  // The seed data should have this as the default, or a beforeAll hook
  // should set it via the admin client:
  //   await supabase.from('surveys').update({ client_access_enabled: false }).eq('id', SEED_SURVEY_ID);
  test('client user blocked when client_access_enabled = false', async ({ page }) => {
    await page.goto(`/results/${SEED_SURVEY_ID}/compass`);

    // Should redirect to dashboard when access is disabled
    await page.waitForURL((url) => !url.pathname.startsWith('/results'), { timeout: 10000 });
    expect(page.url()).toContain('/dashboard');
  });
});

test.describe('Results access gate — client user allowed', () => {
  test.use({ storageState: 'e2e/.auth/client.json' });

  // Prerequisite: client_access_enabled = true on the seed survey.
  // A beforeAll hook should set this via the admin client:
  //   await supabase.from('surveys').update({ client_access_enabled: true }).eq('id', SEED_SURVEY_ID);
  test('client user allowed when client_access_enabled = true', async ({ page }) => {
    await page.goto(`/results/${SEED_SURVEY_ID}/compass`);

    // Should stay on the results page
    await page.waitForURL((url) => url.pathname.includes('/results'), { timeout: 10000 });
    await expect(page.getByRole('navigation')).toBeVisible();
  });
});

test.describe('Results access gate — admin always has access', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' });

  test('admin user always has access regardless of client_access_enabled', async ({ page }) => {
    await page.goto(`/results/${SEED_SURVEY_ID}/compass`);

    // Admin should always see results
    await page.waitForURL((url) => url.pathname.includes('/results'), { timeout: 10000 });
    await expect(page.getByRole('navigation')).toBeVisible();
  });
});
