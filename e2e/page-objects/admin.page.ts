import { type Page, type Locator } from '@playwright/test';

export class AdminPage {
  readonly page: Page;

  /** Navigation */
  readonly surveysTab: Locator;
  readonly clientsTab: Locator;

  /** Survey list */
  readonly newSurveyButton: Locator;
  readonly surveyCards: Locator;

  /** Survey builder */
  readonly dimensionNavigator: Locator;
  readonly questionRows: Locator;
  readonly deployButton: Locator;
  readonly surveyLinkDisplay: Locator;

  constructor(page: Page) {
    this.page = page;
    this.surveysTab = page.getByRole('tab', { name: /surveys/i });
    this.clientsTab = page.getByRole('tab', { name: /clients/i });
    this.newSurveyButton = page.getByRole('button', { name: /new survey/i });
    this.surveyCards = page.getByTestId('survey-card').or(
      page.locator('button').filter({ hasText: /responses|remaining|active|draft|closed|archived/i }),
    );
    this.dimensionNavigator = page.getByTestId('dimension-navigator');
    this.questionRows = page.getByTestId('question-row');
    this.deployButton = page.getByRole('button', { name: /publish/i });
    this.surveyLinkDisplay = page.getByTestId('survey-link');
  }

  async goto(): Promise<void> {
    await this.page.goto('/admin/clients');
  }

  async gotoClient(clientId: string): Promise<void> {
    await this.page.goto(`/admin/clients/${clientId}`);
  }
}
