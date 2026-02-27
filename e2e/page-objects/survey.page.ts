import { type Page, type Locator } from '@playwright/test';

export class SurveyPage {
  readonly page: Page;

  /** Metadata form / welcome */
  readonly startButton: Locator;

  /** Likert question */
  readonly likertOptions: Locator;
  readonly nextButton: Locator;

  /** Open-ended */
  readonly openEndedTextarea: Locator;
  readonly submitButton: Locator;
  readonly skipButton: Locator;

  /** Thank you */
  readonly thankYouHeading: Locator;

  /** Edge states */
  readonly invalidTokenScreen: Locator;
  readonly surveyClosedScreen: Locator;
  readonly surveyNotOpenScreen: Locator;
  readonly alreadyCompletedScreen: Locator;

  constructor(page: Page) {
    this.page = page;

    this.startButton = page.getByRole('button', { name: /start survey/i });
    this.likertOptions = page.getByRole('radio');
    this.nextButton = page.getByRole('button', { name: /next/i });
    this.openEndedTextarea = page.getByRole('textbox');
    this.submitButton = page.getByRole('button', { name: /submit/i });
    this.skipButton = page.getByRole('button', { name: /skip/i });
    this.thankYouHeading = page.getByRole('heading', { name: /thank you/i });

    this.invalidTokenScreen = page.getByTestId('invalid-token');
    this.surveyClosedScreen = page.getByTestId('survey-closed');
    this.surveyNotOpenScreen = page.getByTestId('survey-not-open');
    this.alreadyCompletedScreen = page.getByTestId('already-completed');
  }

  async goto(token: string): Promise<void> {
    await this.page.goto(`/s/${token}`);
  }

  /**
   * Answers all likert questions by clicking the first radio option
   * and advancing with the next button until no more likert options appear.
   */
  async answerAllLikertQuestions(): Promise<void> {
    while (await this.likertOptions.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await this.likertOptions.first().click();
      await this.nextButton.click();
    }
  }
}
