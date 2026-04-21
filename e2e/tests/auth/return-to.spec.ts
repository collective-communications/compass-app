import { test, expect, type Page } from '@playwright/test';

/**
 * returnTo parity — protected routes must preserve the originally-requested
 * path through the sign-in bounce, and open-redirect attempts must fall back
 * to the role's tier home (never a third-party origin).
 *
 * Two halves per scenario:
 *   1. Unauthenticated visit → `/auth/login?returnTo=<encoded path>`
 *   2. Sign in as an allowed role → final URL is the original target
 *      (except the open-redirect cases, which land on tier home).
 *
 * Keep this spec aligned with `apps/web/src/lib/route-permissions.ts`
 * (ROUTE_ACCESS keys). Importing that module directly would pull React
 * into the Node-level Playwright bundler, so we mirror the list here and
 * rely on the parity unit-test `route-permissions.parity.test.ts` to
 * catch drift at build time.
 */

const SEED_PASSWORD = 'TestPass123!';

/** Signed-in identity used to exercise each path after the returnTo hop. */
interface SignInCreds {
  email: string;
  password: string;
  tierHome: '/clients' | '/dashboard';
}

const CCC_ADMIN: SignInCreds = {
  email: 'admin@collectivecommunication.ca',
  password: SEED_PASSWORD,
  tierHome: '/clients',
};

const CLIENT_EXEC: SignInCreds = {
  email: 'exec@rivervalleyhealth.ca',
  password: SEED_PASSWORD,
  tierHome: '/dashboard',
};

interface Scenario {
  label: string;
  /** The path we visit while unauthenticated. */
  targetPath: string;
  /** Credentials to sign in with after the unauth bounce. */
  signInAs: SignInCreds;
  /**
   * Pathname prefix the caller must land on after sign-in succeeds. We match
   * by prefix because some routes redirect (e.g. `/results/:id` → `/compass`
   * sub-route after mounting) or swap the URL during data loading.
   */
  expectedLandingPrefix: string;
  /**
   * Expected `returnTo` value attached to the bounce URL — the full path the
   * user originally requested, URL-decoded. Routes whose `beforeLoad` hands
   * `guardRoute` a parent path (e.g. `/clients` for the detail layout) break
   * this contract; this assertion is what locks in the Wave 1.x fix that
   * forwards `location.pathname` end-to-end.
   */
  expectedReturnTo: string;
}

// Seeded deterministic IDs — see `scripts/seed-dev.ts`.
const SEED_CLIENT_ORG = '00000000-0000-0000-0000-000000000002';
const SEED_SURVEY_ID = '00000000-0000-0000-0000-000000000100';

const SCENARIOS: Scenario[] = [
  {
    label: '/clients (tier_1 home)',
    targetPath: '/clients',
    signInAs: CCC_ADMIN,
    expectedLandingPrefix: '/clients',
    expectedReturnTo: '/clients',
  },
  {
    label: '/clients/:orgId/overview',
    targetPath: `/clients/${SEED_CLIENT_ORG}/overview`,
    signInAs: CCC_ADMIN,
    expectedLandingPrefix: `/clients/${SEED_CLIENT_ORG}`,
    expectedReturnTo: `/clients/${SEED_CLIENT_ORG}/overview`,
  },
  {
    label: '/dashboard',
    targetPath: '/dashboard',
    signInAs: CLIENT_EXEC,
    expectedLandingPrefix: '/dashboard',
    expectedReturnTo: '/dashboard',
  },
  {
    label: '/results/:surveyId/compass',
    targetPath: `/results/${SEED_SURVEY_ID}/compass`,
    signInAs: CCC_ADMIN,
    expectedLandingPrefix: `/results/${SEED_SURVEY_ID}`,
    expectedReturnTo: `/results/${SEED_SURVEY_ID}/compass`,
  },
  {
    label: '/reports/:surveyId',
    targetPath: `/reports/${SEED_SURVEY_ID}`,
    signInAs: CCC_ADMIN,
    expectedLandingPrefix: `/reports/${SEED_SURVEY_ID}`,
    expectedReturnTo: `/reports/${SEED_SURVEY_ID}`,
  },
  {
    label: '/surveys/:surveyId (builder)',
    targetPath: `/surveys/${SEED_SURVEY_ID}`,
    signInAs: CCC_ADMIN,
    expectedLandingPrefix: `/surveys/${SEED_SURVEY_ID}`,
    expectedReturnTo: `/surveys/${SEED_SURVEY_ID}`,
  },
  {
    label: '/users',
    targetPath: '/users',
    signInAs: CCC_ADMIN,
    expectedLandingPrefix: '/users',
    expectedReturnTo: '/users',
  },
  {
    label: '/settings',
    targetPath: '/settings',
    signInAs: CCC_ADMIN,
    expectedLandingPrefix: '/settings',
    expectedReturnTo: '/settings',
  },
  {
    label: '/profile',
    targetPath: '/profile',
    signInAs: CCC_ADMIN,
    expectedLandingPrefix: '/profile',
    expectedReturnTo: '/profile',
  },
  {
    label: '/help',
    targetPath: '/help',
    signInAs: CCC_ADMIN,
    expectedLandingPrefix: '/help',
    expectedReturnTo: '/help',
  },
];

/** Clears any cookies/local storage from a prior test and any auth-setup leak. */
async function resetAuth(page: Page): Promise<void> {
  // Clear cookies at context level first so nothing is in-flight.
  await page.context().clearCookies();
  // Navigate to the app origin so localStorage clear has a valid document.
  await page.goto('/');
  await page.evaluate(() => {
    try {
      window.localStorage.clear();
      window.sessionStorage.clear();
    } catch {
      // ignore — in Chromium with a blank storage state this is a no-op.
    }
  });
}

/**
 * Submit the login form with the supplied credentials and wait for the
 * /auth/login route to unmount (i.e. we've navigated away to a protected
 * page or the tier home).
 */
async function submitLoginForm(page: Page, creds: SignInCreds): Promise<void> {
  await page.getByLabel('Email').fill(creds.email);
  await page.getByLabel('Password', { exact: true }).fill(creds.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/auth/login'), {
    timeout: 15_000,
  });
}

// Disable the auth-setup dependency — we need these tests to boot with no
// pre-populated storage state so the unauthenticated visit is genuine.
test.describe('returnTo parity', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  for (const scenario of SCENARIOS) {
    test(`preserves returnTo for ${scenario.label}`, async ({ page }) => {
      await resetAuth(page);

      // ── 1. Unauthenticated visit is bounced to /auth/login with returnTo
      await page.goto(scenario.targetPath);
      await page.waitForURL(/\/auth\/login/, { timeout: 10_000 });

      const bounceUrl = new URL(page.url());
      expect(bounceUrl.pathname).toBe('/auth/login');

      const returnTo = bounceUrl.searchParams.get('returnTo');
      expect(returnTo, `missing returnTo on bounce for ${scenario.targetPath}`).not.toBeNull();
      expect(returnTo).toBe(scenario.expectedReturnTo);

      // ── 2. Sign in as an allowed role → lands on the expected target
      await submitLoginForm(page, scenario.signInAs);

      const finalPath = new URL(page.url()).pathname;
      expect(
        finalPath.startsWith(scenario.expectedLandingPrefix),
        `${scenario.targetPath}: expected landing under "${scenario.expectedLandingPrefix}", got "${finalPath}"`,
      ).toBe(true);
    });
  }

  // ── Open-redirect rejection ────────────────────────────────────────────────
  //
  // `isValidReturnTo` in `use-auth.ts` iteratively decodes the candidate and
  // rejects protocol-relative / cross-origin targets. After sign-in the user
  // must land on their tier home, not the attacker's origin.

  test('rejects protocol-relative returnTo=//evil.com', async ({ page }) => {
    await resetAuth(page);
    await page.goto('/auth/login?returnTo=//evil.com');
    await submitLoginForm(page, CCC_ADMIN);

    const finalUrl = new URL(page.url());
    // Never leave our origin.
    expect(finalUrl.origin).toBe(new URL(page.url()).origin);
    // Fall back to tier home.
    expect(finalUrl.pathname.startsWith(CCC_ADMIN.tierHome)).toBe(true);
  });

  test('rejects double-encoded returnTo=%252F%252Fevil.com', async ({ page }) => {
    await resetAuth(page);
    await page.goto('/auth/login?returnTo=%252F%252Fevil.com');
    await submitLoginForm(page, CCC_ADMIN);

    const finalUrl = new URL(page.url());
    expect(finalUrl.origin).toBe(new URL(page.url()).origin);
    expect(finalUrl.pathname.startsWith(CCC_ADMIN.tierHome)).toBe(true);
  });
});
