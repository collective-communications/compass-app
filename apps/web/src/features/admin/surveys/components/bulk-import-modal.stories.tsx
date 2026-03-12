import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { BulkImportModal } from './bulk-import-modal';

const meta = {
  title: 'Features/Admin/Surveys/BulkImportModal',
  component: BulkImportModal,
  args: {
    open: true,
    onClose: fn(),
    onImport: fn(),
    existingEmails: [],
    isPending: false,
  },
} satisfies Meta<typeof BulkImportModal>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Modal open with no data entered yet. */
export const Default: Story = {};

/** Some existing emails that will trigger duplicate detection. */
export const WithExistingEmails: Story = {
  args: {
    existingEmails: ['alice@example.com', 'bob@example.com'],
  },
};

/** Import in progress — button shows loading state. */
export const Importing: Story = {
  args: {
    isPending: true,
  },
};

/** Modal closed — should render nothing visible. */
export const Closed: Story = {
  args: {
    open: false,
  },
};
