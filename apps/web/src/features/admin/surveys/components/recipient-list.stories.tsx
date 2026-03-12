import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import type { SurveyRecipient } from '@compass/types';
import { RecipientList } from './recipient-list';

const recipients: SurveyRecipient[] = [
  { id: 'r-1', surveyId: 's-1', email: 'alice@example.com', name: 'Alice Chen', segmentMetadata: { department: 'Engineering' }, status: 'completed', invitationSentAt: '2026-03-05T10:00:00Z', reminderSentAt: null, createdAt: '2026-03-01T00:00:00Z' },
  { id: 'r-2', surveyId: 's-1', email: 'bob@example.com', name: 'Bob Martinez', segmentMetadata: { department: 'Marketing' }, status: 'invited', invitationSentAt: '2026-03-05T10:00:00Z', reminderSentAt: '2026-03-08T10:00:00Z', createdAt: '2026-03-01T00:00:00Z' },
  { id: 'r-3', surveyId: 's-1', email: 'carol@example.com', name: null, segmentMetadata: {}, status: 'pending', invitationSentAt: null, reminderSentAt: null, createdAt: '2026-03-01T00:00:00Z' },
  { id: 'r-4', surveyId: 's-1', email: 'invalid@bad', name: 'Dave Kim', segmentMetadata: {}, status: 'bounced', invitationSentAt: '2026-03-05T10:00:00Z', reminderSentAt: null, createdAt: '2026-03-01T00:00:00Z' },
];

const meta = {
  title: 'Features/Admin/Surveys/RecipientList',
  component: RecipientList,
  args: {
    recipients,
    isLoading: false,
    onRemove: fn(),
    isRemoving: false,
  },
} satisfies Meta<typeof RecipientList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** List with mixed statuses — pending, invited, completed, bounced. */
export const Default: Story = {};

/** Empty state prompting CSV import. */
export const Empty: Story = {
  args: {
    recipients: [],
  },
};

/** Loading skeleton. */
export const Loading: Story = {
  args: {
    isLoading: true,
  },
};

/** A removal is in progress. */
export const Removing: Story = {
  args: {
    isRemoving: true,
  },
};
