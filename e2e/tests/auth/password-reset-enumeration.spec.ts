import { test, expect, type Page } from '@playwright/test';
import { ensureTestUser } from '../../helpers/auth';

/**
 * Password-reset must not leak whether an email is registered.
 *
 * Invariant: a request for a known email and a request for an unknown email
 * MUST produce identical responses — same screen, same copy, same timing
 * envelope. A variation in any of these dimensions lets an attacker enumerate
 * which email addresses have accounts.
 *
 * The UX also specifies the success screen always appears after form submit,
 * regardless of the upstream Supabase response. See
 * `apps/web/src/features/auth/hooks/use-password-reset.ts`.
 */

const SEED_ORG_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Supabase's `resetPasswordForEmail` rate-limits per-email (once per minute
 * for the same address). To avoid flake, every invocation generates a fresh
 * unique email — the known email is seeded immediately before the test runs
 * so the known branch hits a real auth.users row exactly once.
 */
function uniqueEmail(prefix: string): string {
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${id}@test.compassapp.dev`;
}

async function freshKnownEmail(): Promise<string> {
  const email = uniqueEmail('e2e-reset-existing');
  await ensureTestUser(email, 'client_user', SEED_ORG_ID);
  return email;
}

function freshUnknownEmail(): string {
  return uniqueEmail('e2e-reset-nobody');
}

interface SubmitResult {
  elapsedMs: number;
  url: string;
  heading: string;
  bodyContext: string;
  rateLimited: boolean;
}

/**
 * Submits the forgot-password form and captures response timing and visible
 * copy. Uses `page.waitForURL` instead of `waitForLoadState` so we measure the
 * time-to-render of the sent screen, which is where the leak would appear.
 *
 * If Supabase returns a rate-limit response (common when running these tests
 * back-to-back against a shared cloud project), we surface `rateLimited=true`
 * so the caller can skip the assertion rather than silently passing.
 */
async function submitForgotPassword(page: Page, email: string): Promise<SubmitResult> {
  await page.goto('/auth/forgot-password');
  await page.waitForLoadState('networkidle');

  const emailInput = page.getByLabel('Email');
  const submit = page.getByRole('button', { name: /send reset link/i });

  await emailInput.waitFor({ state: 'visible', timeout: 10_000 });
  await emailInput.fill(email);
  await expect(submit).toBeEnabled({ timeout: 5_000 });

  const start = Date.now();
  await submit.click();

  // Either we navigate to the sent screen (both happy paths) or the form
  // shows a rate-limit alert. Race both so we can tell them apart.
  const rateLimitAlert = page.getByRole('alert').filter({ hasText: /too many requests|rate/i });
  try {
    await Promise.race([
      page.waitForURL(/\/auth\/forgot-password\/sent/, { timeout: 15_000 }),
      rateLimitAlert.waitFor({ state: 'visible', timeout: 15_000 }),
    ]);
  } catch {
    // fall through — the assertion below will fail the test
  }

  if (await rateLimitAlert.isVisible().catch(() => false)) {
    return {
      elapsedMs: Date.now() - start,
      url: page.url(),
      heading: '',
      bodyContext: '',
      rateLimited: true,
    };
  }

  await page.waitForURL(/\/auth\/forgot-password\/sent/, { timeout: 5_000 });

  // Wait for the sent-screen heading to render, which is the earliest DOM
  // signal that the new route has mounted. This establishes the timing
  // boundary for the enumeration check.
  const sentHeading = page.getByRole('heading', { name: 'Check your email', level: 1 });
  await sentHeading.waitFor({ state: 'visible', timeout: 15_000 });
  const elapsedMs = Date.now() - start;

  const heading = (await sentHeading.textContent())?.trim() ?? '';

  // Capture the numbered instructions — these are the same for both paths.
  // The sent screen renders a single <ol>; use it directly to avoid matching
  // the "didn't receive the email?" <ul> on the forgot-password page during
  // route transition.
  const list = page.getByRole('list').first();
  await list.waitFor({ state: 'visible', timeout: 5_000 });
  const items = await list.getByRole('listitem').allTextContents();
  const bodyContext = items.map((t) => t.replace(/\s+/g, ' ').trim()).join('|');

  return {
    elapsedMs,
    url: page.url(),
    heading,
    bodyContext,
    rateLimited: false,
  };
}

test('forgot-password: known email lands on sent screen', async ({ page }) => {
  const knownEmail = await freshKnownEmail();
  const result = await submitForgotPassword(page, knownEmail);
  test.skip(result.rateLimited, 'Supabase email rate-limit hit — re-run after a cooldown');
  expect(result.url).toContain('/auth/forgot-password/sent');
  expect(result.heading).toBe('Check your email');
});

test('forgot-password: unknown email lands on the IDENTICAL sent screen', async ({ page }) => {
  const unknownEmail = freshUnknownEmail();
  const result = await submitForgotPassword(page, unknownEmail);
  test.skip(result.rateLimited, 'Supabase email rate-limit hit — re-run after a cooldown');
  expect(result.url).toContain('/auth/forgot-password/sent');
  expect(result.heading).toBe('Check your email');
});

test('forgot-password: known vs unknown produce identical UI copy and similar timing', async ({ page }) => {
  const knownEmail = await freshKnownEmail();
  const unknownEmail = freshUnknownEmail();
  const known = await submitForgotPassword(page, knownEmail);
  const unknown = await submitForgotPassword(page, unknownEmail);
  test.skip(
    known.rateLimited || unknown.rateLimited,
    'Supabase email rate-limit hit — re-run after a cooldown',
  );

  // Exact heading match — not substring, not regex.
  expect(known.heading).toBe(unknown.heading);

  // Exact body instruction list match.
  expect(known.bodyContext).toBe(unknown.bodyContext);

  // Both must land on the same route.
  expect(new URL(known.url).pathname).toBe(new URL(unknown.url).pathname);

  // Timing envelope: the two paths should complete within a small window of
  // each other. Supabase's resetPasswordForEmail is constant-time at the edge,
  // and our hook navigates unconditionally, so a known-vs-unknown delta that
  // exceeds network jitter is a timing side-channel.
  //
  // Default: 500ms. Override via E2E_RESET_TIMING_MS if running against a
  // slow shared environment.
  const timingBudgetMs = Number(process.env.E2E_RESET_TIMING_MS ?? '500');
  const delta = Math.abs(known.elapsedMs - unknown.elapsedMs);
  expect(delta, `known=${known.elapsedMs}ms unknown=${unknown.elapsedMs}ms delta=${delta}ms`)
    .toBeLessThan(timingBudgetMs);
});
