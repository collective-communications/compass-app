import type { Meta, StoryObj } from '@storybook/react';
import { DialogueTab, DialogueInsightsContent } from './dialogue-tab';

const meta = {
  title: 'Features/Results/Dialogue/DialogueTab',
  component: DialogueTab,
  args: {
    surveyId: 'survey-001',
  },
  parameters: {
    docs: {
      description: {
        component:
          'Composite tab component that fetches dialogue responses and renders keyword bubbles, filters, search, and response cards. Requires QueryClientProvider and a Supabase session.',
      },
    },
  },
} satisfies Meta<typeof DialogueTab>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Renders the loading skeleton while data is being fetched. */
export const Default: Story = {};

/** Static insights panel content (no data dependency). */
export const InsightsContent: Story = {
  render: () => <DialogueInsightsContent />,
};
