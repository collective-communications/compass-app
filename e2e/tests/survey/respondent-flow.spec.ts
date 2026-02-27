import { test, expect } from '@playwright/test';
import { SurveyPage } from '../../page-objects/survey.page';
import { createActiveDeployment, cleanupDeployment } from '../../helpers/survey';

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

test('complete full survey with open-ended response', async ({ page }) => {
  const survey = new SurveyPage(page);

  await survey.goto(token);
  await survey.startButton.click();
  await survey.answerAllLikertQuestions();

  // Open-ended question
  await expect(survey.openEndedTextarea).toBeVisible();
  await survey.openEndedTextarea.fill('This is a test response for the open-ended question.');
  await survey.submitButton.click();

  // Thank you screen
  await expect(survey.thankYouHeading).toBeVisible();
});

test('complete survey skipping open-ended', async ({ page }) => {
  const survey = new SurveyPage(page);

  await survey.goto(token);
  await survey.startButton.click();
  await survey.answerAllLikertQuestions();

  // Skip open-ended
  await expect(survey.skipButton).toBeVisible();
  await survey.skipButton.click();

  // Thank you screen
  await expect(survey.thankYouHeading).toBeVisible();
});
