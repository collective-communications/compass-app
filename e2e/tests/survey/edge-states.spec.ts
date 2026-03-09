import { test, expect } from '@playwright/test';
import { SurveyPage } from '../../page-objects/survey.page';
import { createActiveDeployment, cleanupDeployment, SEED_SURVEY_ID } from '../../helpers/survey';
import { createAdminClient } from '../../helpers/db';

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

    // Save current opens_at, then set it to the future
    const { data: original } = await supabase
      .from('surveys')
      .select('opens_at')
      .eq('id', SEED_SURVEY_ID)
      .single();

    try {
      await supabase
        .from('surveys')
        .update({ opens_at: new Date(Date.now() + 86_400_000 * 30).toISOString() })
        .eq('id', SEED_SURVEY_ID);

      const survey = new SurveyPage(page);
      await survey.goto(token);
      await expect(survey.surveyNotOpenScreen).toBeVisible();
    } finally {
      // Restore original opens_at
      await supabase
        .from('surveys')
        .update({ opens_at: original?.opens_at ?? '2026-01-15T00:00:00Z' })
        .eq('id', SEED_SURVEY_ID);
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
    // First: complete the survey
    const survey = new SurveyPage(page);
    await survey.goto(token);
    await survey.fillMetadata();
    await survey.startButton.click();
    await survey.answerAllLikertQuestions();
    await survey.skipButton.click();
    await expect(survey.thankYouHeading).toBeVisible();

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
