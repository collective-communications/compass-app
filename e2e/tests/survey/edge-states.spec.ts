import { test, expect } from '@playwright/test';
import { SurveyPage } from '../../page-objects/survey.page';
import { createActiveDeployment, cleanupDeployment, SEED_SURVEY_ID } from '../../helpers/survey';
import { createAdminClient } from '../../helpers/db';

// These tests mutate shared survey state — run serially
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
