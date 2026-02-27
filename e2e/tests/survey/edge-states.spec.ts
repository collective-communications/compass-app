import { test, expect } from '@playwright/test';
import { SurveyPage } from '../../page-objects/survey.page';
import { createActiveDeployment, cleanupDeployment, SEED_SURVEY_ID } from '../../helpers/survey';
import { createAdminClient } from '../../helpers/db';

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
    // Restore survey status and clean up
    const supabase = createAdminClient();
    await supabase.from('surveys').update({ status: 'active' }).eq('id', SEED_SURVEY_ID);
    await cleanupDeployment(deploymentId);
  }
});

test('not-yet-open survey shows survey-not-open screen', async ({ page }) => {
  const supabase = createAdminClient();

  // Create a deployment that opens in the future
  const { data, error } = await supabase
    .from('deployments')
    .insert({
      survey_id: SEED_SURVEY_ID,
      type: 'anonymous_link',
      is_active: true,
      opens_at: new Date(Date.now() + 86_400_000 * 30).toISOString(), // opens in 30 days
    })
    .select('id, token')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create future deployment: ${error?.message}`);
  }

  try {
    const survey = new SurveyPage(page);
    await survey.goto(data.token as string);
    await expect(survey.surveyNotOpenScreen).toBeVisible();
  } finally {
    await supabase.from('deployments').delete().eq('id', data.id);
  }
});
