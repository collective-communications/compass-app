import { test, expect } from '@playwright/test';
import { SurveyPage } from '../../page-objects/survey.page';
import { createActiveDeployment, cleanupDeployment, SEED_SURVEY_ID } from '../../helpers/survey';
import { createAdminClient } from '../../helpers/db';

// Seeded deployment IDs mirrored from `scripts/seed-dev.ts` (const IDS).
// These three deployments are created by `seedEdgeCaseDeployments()` with
// relative-now dates from `seedDates()`; their `token` column is UUID-generated
// at insert time, so tests look it up at runtime rather than hardcoding.
const SEEDED_EDGE_DEPLOYMENT_IDS = {
  expired: '00000000-0000-0000-0000-000000000201',
  notOpen: '00000000-0000-0000-0000-000000000202',
  closed: '00000000-0000-0000-0000-000000000203',
} as const;

/**
 * Look up the seeded token for a given deployment id. Skips the test if the
 * seed hasn't been run (row missing) rather than failing loudly — Wave 2.3
 * spec explicitly calls this out.
 */
async function getSeededToken(deploymentId: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('deployments')
    .select('token')
    .eq('id', deploymentId)
    .maybeSingle();
  return (data?.token as string | undefined) ?? null;
}

// These tests mutate shared survey state — run serially
test.describe('survey state edge cases', () => {
  test.describe.configure({ mode: 'serial' });

  test('invalid token shows invalid-token screen', async ({ page }) => {
    const survey = new SurveyPage(page);
    await survey.goto('00000000-0000-0000-0000-000000000000');
    await expect(survey.invalidTokenScreen).toBeVisible();
  });

  test('closed survey shows survey-closed screen', async ({ page }) => {
    const { token, deploymentId } = await createActiveDeployment();

    try {
      const supabase = createAdminClient();
      await supabase.from('surveys').update({ status: 'closed' }).eq('id', SEED_SURVEY_ID);

      const survey = new SurveyPage(page);
      await survey.goto(token);
      await expect(survey.surveyClosedScreen).toBeVisible();
    } finally {
      const supabase = createAdminClient();
      await supabase.from('surveys').update({ status: 'active' }).eq('id', SEED_SURVEY_ID);
      await cleanupDeployment(deploymentId);
    }
  });

  test('not-yet-open survey shows survey-not-open screen', async ({ page }) => {
    const { token, deploymentId } = await createActiveDeployment();
    const supabase = createAdminClient();

    // The resolver reads opens_at from the DEPLOYMENT row (Wave 1.2 fix). Save
    // the current value, push it into the future, then restore.
    const { data: original } = await supabase
      .from('deployments')
      .select('opens_at')
      .eq('id', deploymentId)
      .single();

    try {
      await supabase
        .from('deployments')
        .update({ opens_at: new Date(Date.now() + 86_400_000 * 30).toISOString() })
        .eq('id', deploymentId);

      const survey = new SurveyPage(page);
      await survey.goto(token);
      await expect(survey.surveyNotOpenScreen).toBeVisible();
    } finally {
      await supabase
        .from('deployments')
        .update({ opens_at: original?.opens_at ?? new Date(Date.now() - 86_400_000).toISOString() })
        .eq('id', deploymentId);
      await cleanupDeployment(deploymentId);
    }
  });
});

test.describe('completed and closed survey edge cases', () => {
  let token: string;
  let deploymentId: string;

  test.beforeEach(async () => {
    const deployment = await createActiveDeployment();
    token = deployment.token;
    deploymentId = deployment.deploymentId;
  });

  test.afterEach(async () => {
    await cleanupDeployment(deploymentId);
  });

  test('already completed survey shows already-completed screen', async ({ page }) => {
    test.setTimeout(90_000);
    // First: complete the survey
    const survey = new SurveyPage(page);
    await survey.goto(token);
    await survey.fillMetadata();
    await survey.startButton.click();
    await survey.answerAllLikertQuestions();
    await expect(survey.skipButton).toBeVisible({ timeout: 10000 });
    await survey.skipButton.click();
    await expect(survey.thankYouHeading).toBeVisible({ timeout: 10000 });

    // Second: revisit the same token — should show already-completed
    await survey.goto(token);
    await expect(survey.alreadyCompletedScreen).toBeVisible();
  });

  test('closed survey renders shell but no question content', async ({ page }) => {
    const { token: closedToken, deploymentId: closedDeploymentId } = await createActiveDeployment();

    try {
      const supabase = createAdminClient();
      await supabase.from('surveys').update({ status: 'closed' }).eq('id', SEED_SURVEY_ID);

      const survey = new SurveyPage(page);
      await survey.goto(closedToken);
      await expect(survey.surveyClosedScreen).toBeVisible();

      // Should NOT show any question elements
      await expect(survey.likertOptions.first()).not.toBeVisible();
      await expect(survey.startButton).not.toBeVisible();
    } finally {
      const supabase = createAdminClient();
      await supabase.from('surveys').update({ status: 'active' }).eq('id', SEED_SURVEY_ID);
      await cleanupDeployment(closedDeploymentId);
    }
  });
});

// Wave 2.3 — exercises the seeded edge-case deployments from
// `scripts/seed-dev.ts`. Unlike the mutation-based tests above, these are
// read-only: they depend on the seed having been run at least once.
// If the seed is absent the test is skipped rather than failed.
test.describe('seeded edge-state deployments (Wave 2.3)', () => {
  test('not_yet_open: seeded future deployment shows "Survey Not Yet Open" + opens date', async ({ page }) => {
    const token = await getSeededToken(SEEDED_EDGE_DEPLOYMENT_IDS.notOpen);
    test.skip(!token, 'Seed has not been run — deploymentNotOpen row missing');

    const survey = new SurveyPage(page);
    await survey.goto(token!);

    await expect(survey.surveyNotOpenScreen).toBeVisible();
    // Component copy: "Survey Not Yet Open" — match /not open/i per spec.
    await expect(
      page.getByRole('heading', { name: /not\s*(yet)?\s*open/i }),
    ).toBeVisible();

    // Seeded `opens_at` is +180 days from now — assert the year or "opens on"
    // appears in the screen. Full format is "en-CA long": e.g. "September 21, 2026".
    await expect(
      survey.surveyNotOpenScreen.getByText(/opens on/i),
    ).toBeVisible();
  });

  test('closed: seeded closed-survey deployment shows "Survey Closed" + close date and NOT "Invalid"', async ({ page }) => {
    const token = await getSeededToken(SEEDED_EDGE_DEPLOYMENT_IDS.closed);
    test.skip(!token, 'Seed has not been run — deploymentClosed row missing');

    const survey = new SurveyPage(page);
    await survey.goto(token!);

    await expect(survey.surveyClosedScreen).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /survey closed/i }),
    ).toBeVisible();
    // Close-date copy rendered by SurveyClosedScreen when closesAt is provided.
    await expect(
      survey.surveyClosedScreen.getByText(/closed on/i),
    ).toBeVisible();

    // Regression guard — a closed survey whose deployment also has past dates
    // must NOT route to the invalid-token screen (Wave 1.2 fix). Scope the
    // negative assertion to the visible edge-state content so it does not
    // accidentally match generic chrome, accessibility text, or test tooling.
    await expect(page.getByTestId('invalid-token')).toHaveCount(0);
    await expect(survey.surveyClosedScreen).not.toContainText(/invalid/i);
  });

  test('expired: seeded expired deployment shows "Survey Link Expired"', async ({ page }) => {
    const token = await getSeededToken(SEEDED_EDGE_DEPLOYMENT_IDS.expired);
    test.skip(!token, 'Seed has not been run — deploymentExpired row missing');

    const survey = new SurveyPage(page);
    await survey.goto(token!);

    const expiredScreen = page.getByTestId('deployment-expired');
    await expect(expiredScreen).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /expired/i }),
    ).toBeVisible();
    // Wave A9: close date surfaced below the heading ("Closed on <month> <day>, <year>").
    await expect(expiredScreen.getByText(/closed on .* 20\d\d/i)).toBeVisible();
  });

  test('invalid: bogus token shows "Invalid Survey Link"', async ({ page }) => {
    // Covered by the existing "invalid token" test above with the all-zero UUID;
    // this duplicate covers the plan-specified `0000...0000deadbeef` literal
    // and asserts the exact copy ("Invalid Survey Link") rather than just
    // the test-id.
    const survey = new SurveyPage(page);
    await survey.goto('00000000-0000-0000-0000-0000deadbeef');

    await expect(survey.invalidTokenScreen).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /invalid survey link/i }),
    ).toBeVisible();
  });

  test('minimal shell: edge-state survey screen renders no avatar / sign-out / profile chrome', async ({ page }) => {
    const token = await getSeededToken(SEEDED_EDGE_DEPLOYMENT_IDS.notOpen);
    test.skip(!token, 'Seed has not been run — deploymentNotOpen row missing');

    const survey = new SurveyPage(page);
    await survey.goto(token!);
    await expect(survey.surveyNotOpenScreen).toBeVisible();

    // Flow 2.1 step 2 — structural anonymity: the survey shell has no user
    // chrome. Assert the SurveyHeader does not render a profile menu, avatar,
    // or sign-out affordance.
    await expect(page.getByRole('button', { name: /sign[ -]?out/i })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /profile/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /profile/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /account|user menu/i })).toHaveCount(0);
    // "Profile" word must not appear anywhere in the rendered survey shell.
    await expect(page.locator('body')).not.toContainText(/\bprofile\b/i);
  });
});
