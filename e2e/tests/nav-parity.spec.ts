import { test, expect } from '@playwright/test';

/**
 * Cross-role navigation parity.
 *
 * Every authenticated role should see the same profile-menu surface (Profile,
 * Help, Settings, Theme, Sign out) and the same shell anatomy — only the
 * destinations differ. This spec is the behavioural counterpart to the
 * `navigation.test.ts` contract test: the contract asserts the config is
 * uniform, and this spec asserts the rendered UI actually reflects it.
 *
 * Also covers the forbidden-route redirect path: any role that hits a path it
 * can't access lands on its tier home (not a 404, not an error page).
 */

interface RoleFixture {
  readonly label: string;
  readonly storageState: string;
  readonly home: string;
  readonly forbidden: string;
}

const ROLES: readonly RoleFixture[] = [
  { label: 'ccc_admin',  storageState: 'e2e/.auth/admin.json',      home: '/clients',   forbidden: '/dashboard' },
  { label: 'ccc_member', storageState: 'e2e/.auth/ccc-member.json', home: '/clients',   forbidden: '/dashboard' },
  { label: 'client_exec', storageState: 'e2e/.auth/client.json',    home: '/dashboard', forbidden: '/clients' },
  { label: 'director',   storageState: 'e2e/.auth/director.json',   home: '/dashboard', forbidden: '/clients' },
  { label: 'manager',    storageState: 'e2e/.auth/manager.json',    home: '/dashboard', forbidden: '/clients' },
];

const REQUIRED_MENU_LABELS = ['Profile', 'Help', 'Settings', 'Sign out'] as const;

for (const role of ROLES) {
  test.describe(`Nav parity — ${role.label}`, () => {
    test.use({ storageState: role.storageState });

    test('profile menu contains every required item', async ({ page }) => {
      await page.goto(role.home);
      await page.waitForLoadState('networkidle');

      // Avatar button opens the menu
      const avatarButton = page.getByRole('button', { expanded: false }).filter({
        hasText: /./, // any content — initials or image alt
      }).first();
      // Match any aria-haspopup target — the ProfileMenu uses the
      // spec-correct "menu" value, older code used "true"; both are valid.
      const menuTrigger = page
        .locator('button[aria-haspopup="menu"], button[aria-haspopup="true"]')
        .first();
      await menuTrigger.click();

      const menu = page.getByRole('menu');
      await expect(menu).toBeVisible({ timeout: 5000 });

      for (const label of REQUIRED_MENU_LABELS) {
        await expect(
          menu.getByRole('menuitem', { name: new RegExp(label, 'i') }),
        ).toBeVisible();
      }

      // Theme toggle is labelled dynamically ("Dark mode" or "Light mode")
      await expect(
        menu.getByRole('menuitem', { name: /(dark|light) mode/i }),
      ).toBeVisible();

      // Suppress unused-variable warning
      void avatarButton;
    });

    test('clicking logo lands on tier home', async ({ page }) => {
      // Start from a non-home path so the logo click is a meaningful navigation
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      // The brand link wraps the compass logo
      const brandLink = page.locator(`a[href="${role.home}"]`).first();
      await brandLink.click();

      await expect(page).toHaveURL(new RegExp(role.home.replace('/', '\\/')), {
        timeout: 10000,
      });
    });

    test('forbidden path redirects to tier home', async ({ page }) => {
      await page.goto(role.forbidden);
      await page.waitForURL(
        (url) => url.pathname.startsWith(role.home),
        { timeout: 10000 },
      );
      expect(page.url()).toContain(role.home);
    });

    test('/settings, /help, /profile are reachable', async ({ page }) => {
      for (const path of ['/settings', '/help', '/profile']) {
        await page.goto(path);
        await expect(page).toHaveURL(new RegExp(path), { timeout: 10000 });
      }
    });
  });
}
