import { test, expect } from '@playwright/test';

/**
 * Landing-page content lock-in.
 *
 * Wave 1.6 set the public landing copy: product name with trademark, the
 * secondary tagline, the required footer, and a sign-in link. This spec
 * fails loudly if any of those drift so CLAUDE.md's naming rules can't
 * silently regress.
 *
 * Runs unauthenticated — `auth.setup.ts` storage states are deliberately
 * NOT loaded for this spec.
 */

test.describe('Landing page', () => {
  // Ensure no storage state leaks in from the auth-setup project.
  test.use({ storageState: { cookies: [], origins: [] } });

  test('renders the canonical heading, tagline, footer and sign-in link', async ({ page }) => {
    await page.goto('/');

    // Canonical product name (with trademark glyph) — see CLAUDE.md language rules.
    await expect(
      page.getByRole('heading', { name: /The Collective Culture Compass\u2122/ }),
    ).toBeVisible();

    // Secondary tagline — uppercase, terminated by periods.
    await expect(page.getByText('YOUR PEOPLE. YOUR STORY.')).toBeVisible();

    // Footer copyright string — rendered at the bottom of `BaseLayout`.
    await expect(
      page.getByText(/©\s*2026 Collective Culture \+ Communication Inc\./),
    ).toBeVisible();

    // Sign-in link points at the auth entry.
    const signIn = page.getByRole('link', { name: /^Sign in$/ });
    await expect(signIn).toBeVisible();
    await signIn.click();
    await page.waitForURL(/\/auth\/login(\?|$)/);
    expect(new URL(page.url()).pathname).toBe('/auth/login');
  });
});
