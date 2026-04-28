import { test, expect, type Page } from '@playwright/test';
import { createAdminClient } from '../../helpers/db';

/**
 * Admin org-settings E2E tests (Wave 2.5).
 *
 * Covers the Wave 1.3 graceful empty-state behavior: the settings page must
 * render the form (not an indefinite loader) when no `organization_settings`
 * row exists, and the first save must upsert the row.
 *
 * Seed orgs relied on:
 *  - Summit Analytics — id `00000000-0000-0000-0000-000000000005`. This org
 *    exists in the seeded database and intentionally has NO
 *    `organization_settings` row.
 *  - River Valley Health — id `00000000-0000-0000-0000-000000000002`, has a
 *    row with `client_access_enabled: true` (see scripts/seed-dev.ts:930).
 *
 * Teardown strategy: after the upsert test, delete the row created via the
 * service-role client. Leaves the DB in its canonical "no row" state so the
 * missing-row test and this test remain re-runnable.
 */

const NO_SETTINGS_ORG_ID = '00000000-0000-0000-0000-000000000005';
const RIVER_VALLEY_ORG_ID = '00000000-0000-0000-0000-000000000002';

/** Resolve the client-access switch (aria role=switch, label "Enable client access to results"). */
function clientAccessToggle(page: Page) {
  return page.getByRole('switch', { name: /client access is (enabled|disabled)/i });
}

async function deleteOrgSettingsRow(organizationId: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('organization_settings')
    .delete()
    .eq('organization_id', organizationId);
  if (error) {
    throw new Error(`Failed to delete organization_settings for ${organizationId}: ${error.message}`);
  }
}

async function getClientAccessEnabled(organizationId: string): Promise<boolean | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('organization_settings')
    .select('client_access_enabled')
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch organization_settings for ${organizationId}: ${error.message}`);
  }

  return (data?.client_access_enabled as boolean | undefined) ?? null;
}

test.describe('Admin org settings', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' });

  test('missing settings row renders form with defaults (not indefinite loader)', async ({ page }) => {
    // Guard: ensure the org truly has no row (other tests might upsert and
    // fail to clean up; this makes the assertion about the "missing row"
    // path deterministic).
    await deleteOrgSettingsRow(NO_SETTINGS_ORG_ID);

    await page.goto(`/clients/${NO_SETTINGS_ORG_ID}/settings`);

    // The Wave 1.3 fix replaces the "Loading organization settings..." block
    // with a skeleton that resolves to the real form. The toggle switch must
    // appear within 2s (once the query settles).
    const toggle = clientAccessToggle(page);
    await expect(toggle).toBeVisible({ timeout: 2000 });

    // Indefinite loading copy must NOT be on the page.
    await expect(page.getByText(/Loading organization settings/i)).toHaveCount(0);

    // The `needsCreate` hint surfaces the "defaults shown" copy (see
    // org-settings-page.tsx line 92).
    await expect(page.getByText(/defaults shown/i)).toBeVisible();

    // Default `client_access_enabled` is false → switch is aria-checked="false".
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  test('existing settings row renders with saved values', async ({ page }) => {
    await page.goto(`/clients/${RIVER_VALLEY_ORG_ID}/settings`);

    const toggle = clientAccessToggle(page);
    await expect(toggle).toBeVisible({ timeout: 5000 });

    // River Valley seed sets client_access_enabled = true.
    await expect(toggle).toHaveAttribute('aria-checked', 'true');

    // The `needsCreate` hint must NOT appear for an existing row.
    await expect(page.getByText(/defaults shown/i)).toHaveCount(0);
  });

  test('toggling client access upserts a new row and persists across reload', async ({ page }) => {
    // Fresh start: remove any prior row so we exercise the missing-row →
    // upsert path.
    await deleteOrgSettingsRow(NO_SETTINGS_ORG_ID);

    try {
      await page.goto(`/clients/${NO_SETTINGS_ORG_ID}/settings`);

      const toggle = clientAccessToggle(page);
      await expect(toggle).toBeVisible({ timeout: 2000 });
      await expect(toggle).toHaveAttribute('aria-checked', 'false');

      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-checked', 'true');
      await expect
        .poll(() => getClientAccessEnabled(NO_SETTINGS_ORG_ID), { timeout: 10_000 })
        .toBe(true);

      // Reload. If the upsert worked, the row now exists and the toggle stays on,
      // and the `needsCreate` hint goes away.
      await page.reload();

      const toggleAfter = clientAccessToggle(page);
      await expect(toggleAfter).toBeVisible({ timeout: 5000 });
      await expect(toggleAfter).toHaveAttribute('aria-checked', 'true');
      await expect(page.getByText(/defaults shown/i)).toHaveCount(0);
    } finally {
      // Teardown: delete the row we just created so the DB returns to its
      // canonical "no settings row" state. This is cleaner than toggling back
      // via the UI — a `client_access_enabled=false` row is semantically
      // different from "no row" and would break the first test on a rerun.
      await deleteOrgSettingsRow(NO_SETTINGS_ORG_ID);
    }
  });
});
