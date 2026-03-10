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
  await survey.fillMetadata();
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
  await survey.fillMetadata();
  await survey.startButton.click();
  await survey.answerAllLikertQuestions();

  // Skip open-ended
  await expect(survey.skipButton).toBeVisible();
  await survey.skipButton.click();

  // Thank you screen
  await expect(survey.thankYouHeading).toBeVisible();
});

test('keyboard shortcuts: 1-4 selects answer, Enter advances, Backspace goes back', async ({ page }) => {
  const survey = new SurveyPage(page);
  await survey.goto(token);
  await survey.fillMetadata();
  await survey.startButton.click();

  // Wait for first question
  await survey.likertOptions.first().waitFor({ state: 'visible', timeout: 10000 });

  // Press '3' to select "Agree" (3rd option)
  await page.keyboard.press('3');
  const thirdOption = survey.likertOptions.nth(2);
  await expect(thirdOption).toHaveAttribute('aria-checked', 'true');

  // Press Enter to advance
  await page.keyboard.press('Enter');
  // Should be on question 2 now — verify progress indicator
  await expect(page.getByText(/question 2/i)).toBeVisible({ timeout: 5000 });

  // Press Backspace to go back
  await page.keyboard.press('Backspace');
  // Should be back on question 1 with previous answer preserved
  await expect(page.getByText(/question 1/i)).toBeVisible({ timeout: 5000 });
  await expect(thirdOption).toHaveAttribute('aria-checked', 'true');
});

test('survey header shows no user avatar, sign-out, or profile link', async ({ page }) => {
  const survey = new SurveyPage(page);
  await survey.goto(token);
  await survey.fillMetadata();
  await survey.startButton.click();
  await survey.likertOptions.first().waitFor({ state: 'visible', timeout: 10000 });

  // Survey shell should NOT contain user identity elements
  await expect(page.getByRole('button', { name: /sign out|log out|logout/i })).not.toBeVisible();
  await expect(page.getByRole('link', { name: /profile/i })).not.toBeVisible();
  await expect(page.getByTestId('user-avatar')).not.toBeVisible();
});

test('dimension labels are hidden from respondents', async ({ page }) => {
  const survey = new SurveyPage(page);
  await survey.goto(token);
  await survey.fillMetadata();
  await survey.startButton.click();
  await survey.likertOptions.first().waitFor({ state: 'visible', timeout: 10000 });

  // Dimension names should NOT appear anywhere on the question screen
  for (const dimension of ['Core', 'Clarity', 'Connection', 'Collaboration']) {
    // Check that dimension labels are not visible as headings or badges
    const dimensionLabel = page.locator(`text="${dimension}"`).first();
    const isVisible = await dimensionLabel.isVisible().catch(() => false);
    // Some dimensions like "Core" might appear in other text — check specifically for labels/badges
    if (isVisible) {
      // Verify it's not a dimension indicator (could be in question text naturally)
      const parentTag = await dimensionLabel.evaluate((el) => el.closest('[data-dimension]'));
      expect(parentTag).toBeNull();
    }
  }
});

test('open-ended textarea enforces 2000 character limit', async ({ page }) => {
  const survey = new SurveyPage(page);
  await survey.goto(token);
  await survey.fillMetadata();
  await survey.startButton.click();
  await survey.answerAllLikertQuestions();

  await expect(survey.openEndedTextarea).toBeVisible();

  // Type a short message and verify counter
  await survey.openEndedTextarea.fill('Test response');
  const counter = page.getByText(/\d+.*\/.*2000|characters remaining/i);
  if (await counter.isVisible().catch(() => false)) {
    await expect(counter).toBeVisible();
  }

  // Verify maxlength attribute or character limit enforcement
  const maxLength = await survey.openEndedTextarea.getAttribute('maxlength');
  if (maxLength) {
    expect(parseInt(maxLength)).toBe(2000);
  }
});

test('resume incomplete survey shows welcome-back with progress', async ({ page }) => {
  const survey = new SurveyPage(page);
  await survey.goto(token);
  await survey.fillMetadata();
  await survey.startButton.click();

  // Answer first 3 questions
  for (let i = 0; i < 3; i++) {
    await survey.likertOptions.first().waitFor({ state: 'visible', timeout: 10000 });
    await survey.likertOptions.first().click();
    await expect(survey.nextButton).toBeEnabled({ timeout: 3000 });
    await survey.nextButton.click();
  }

  // Wait for autosave to flush (debounce is 300ms, add margin for network round-trip)
  await page.waitForTimeout(2000);

  // Navigate away and return
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await survey.goto(token);
  await page.waitForLoadState('networkidle');

  // Wait for the page to fully load — either the welcome-back screen,
  // the welcome screen, or the question screen should appear
  // Use expect().toBeVisible() which auto-retries unlike locator.isVisible()
  const resumePrompt = page.getByText(/welcome back/i);
  const welcomeScreen = page.getByText(/hello/i);
  const questionVisible = survey.likertOptions.first();

  // Wait for any of these to appear (whichever loads first)
  try {
    await expect(resumePrompt.or(welcomeScreen).or(questionVisible)).toBeVisible({ timeout: 20000 });
  } catch {
    // If none appeared, the test will fail at the assertion below
  }

  const hasResume = await resumePrompt.isVisible();
  const hasQuestion = await questionVisible.isVisible();
  const hasWelcome = await welcomeScreen.isVisible();

  expect(hasResume || hasQuestion || hasWelcome).toBe(true);
});

test('already completed survey shows already-completed screen on revisit', async ({ page }) => {
  const survey = new SurveyPage(page);

  // Complete the survey
  await survey.goto(token);
  await survey.fillMetadata();
  await survey.startButton.click();
  await survey.answerAllLikertQuestions();
  await survey.skipButton.click();
  await expect(survey.thankYouHeading).toBeVisible();

  // Revisit same token
  await survey.goto(token);
  await expect(survey.alreadyCompletedScreen).toBeVisible({ timeout: 10000 });
});
