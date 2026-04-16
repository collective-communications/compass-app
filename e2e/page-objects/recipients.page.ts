import { type Page, type Locator } from '@playwright/test';

/**
 * Page object for the recipient management section within the survey builder.
 * Encapsulates selectors for the recipient list, add form, bulk import, and send actions.
 */
export class RecipientsPage {
  readonly page: Page;

  /** Recipient list container */
  readonly recipientList: Locator;

  /** Individual recipient rows in the table */
  readonly recipientRows: Locator;

  /** Add recipient form fields */
  readonly emailInput: Locator;
  readonly nameInput: Locator;
  readonly addButton: Locator;

  /** Bulk import controls */
  readonly bulkImportButton: Locator;
  readonly bulkImportModal: Locator;
  readonly bulkImportTextarea: Locator;
  readonly importButton: Locator;

  /** Send invitations */
  readonly sendInvitationsButton: Locator;

  /** Status indicators on recipient rows */
  readonly statusBadges: Locator;

  /** Recipient count display */
  readonly recipientCount: Locator;

  constructor(page: Page) {
    this.page = page;

    this.recipientList = page.getByTestId('recipient-list').or(
      page.locator('table').filter({ hasText: /email/i }),
    );

    this.recipientRows = page.locator('tbody tr');

    this.emailInput = page.getByPlaceholder(/email/i).or(
      page.getByRole('textbox', { name: /email/i }),
    );

    this.nameInput = page.getByPlaceholder(/name/i).or(
      page.getByRole('textbox', { name: /name/i }),
    );

    this.addButton = page.getByRole('button', { name: /add recipient|add$/i });

    this.bulkImportButton = page.getByRole('button', { name: /bulk import|import csv|import/i });

    this.bulkImportModal = page.getByTestId('bulk-import-modal').or(
      page.getByRole('dialog').filter({ hasText: /import/i }),
    );

    this.bulkImportTextarea = page.getByRole('textbox', { name: /csv|paste|import/i }).or(
      page.locator('textarea'),
    );

    this.importButton = page.getByRole('button', { name: /^import$|import recipients/i });

    this.sendInvitationsButton = page.getByRole('button', { name: /send invitations|send all/i });

    this.statusBadges = page.locator('.rounded-full').filter({ hasText: /pending|invited|completed|bounced/i });

    this.recipientCount = page.locator('text=/\\d+ recipients?/i').or(
      page.getByText(/\d+ recipients?/i),
    );
  }

  /** Navigate to the survey builder page (admin surveys) */
  async goto(): Promise<void> {
    await this.page.goto('/clients');
  }

  /** Get the count of visible recipient rows */
  async getRowCount(): Promise<number> {
    return this.recipientRows.count();
  }

  /** Get the remove/delete button for a specific row by index */
  removeButton(index: number): Locator {
    return this.recipientRows.nth(index).getByRole('button', { name: /remove|delete/i });
  }

  /** Get the status badge text for a specific row by index */
  async getRowStatus(index: number): Promise<string | null> {
    const badge = this.recipientRows.nth(index).locator('.rounded-full');
    return badge.textContent();
  }
}
