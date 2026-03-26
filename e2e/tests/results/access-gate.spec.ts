import { test, expect } from '@playwright/test';
import { createAdminClient } from '../../helpers/db';
import { SEED_SURVEY_ID, SEED_ORG_ID } from '../../helpers/survey';

/**
 * Results access gate tests.
 *
 * The `client_access_enabled` flag on the `organizations` table controls
 * whether tier_2 (client) users can view results. Tier_1 (CC+C) users
 * always have access regardless of this flag.
 *
 * Each describe block sets the flag explicitly via beforeAll so tests
 * are deterministic regardless of seed data state.
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

test.describe('Results access gate — client user blocked', () => {
  test.use({ storageState: 'e2e/.auth/client.json' });

  test.beforeAll(async () => {
    await setClientAccess(false);
  });

  test.afterAll(async () => {
    await setClientAccess(true);
  });

  test('client user blocked when client_access_enabled = false', async ({ page }) => {
    await page.goto(`/results/${SEED_SURVEY_ID}/compass`);

    // Should redirect to dashboard when access is disabled
    await page.waitForURL((url) => !url.pathname.startsWith('/results'), { timeout: 10000 });
    expect(page.url()).toContain('/dashboard');
  });
});

test.describe('Results access gate — client user allowed', () => {
  test.use({ storageState: 'e2e/.auth/client.json' });

  test.beforeAll(async () => {
    await setClientAccess(true);
  });

  test('client user allowed when client_access_enabled = true', async ({ page }) => {
    await page.goto(`/results/${SEED_SURVEY_ID}/compass`);

    await page.waitForURL((url) => url.pathname.includes('/results'), { timeout: 15000 });
    await expect(page.getByRole('navigation', { name: 'Results tabs' })).toBeVisible({ timeout: 20000 });
  });
});

test.describe('Results access gate — admin always has access', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' });

  test('admin user always has access regardless of client_access_enabled', async ({ page }) => {
    await page.goto(`/results/${SEED_SURVEY_ID}/compass`);

    await page.waitForURL((url) => url.pathname.includes('/results'), { timeout: 15000 });
    await expect(page.getByRole('navigation', { name: 'Results tabs' })).toBeVisible({ timeout: 20000 });
  });
});
