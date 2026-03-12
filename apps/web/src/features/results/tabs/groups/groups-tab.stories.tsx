import type { Meta, StoryObj } from '@storybook/react';
import { GroupsTab } from './groups-tab';

const meta = {
  title: 'Features/Results/Groups/GroupsTab',
  component: GroupsTab,
  args: {
    surveyId: 'survey-001',
  },
  parameters: {
    docs: {
      description: {
        component:
          'Composite tab component that fetches segment scores, overall scores, and question scores. Requires QueryClientProvider and a Supabase session. Shows loading skeleton while data is being fetched.',
      },
    },
  },
} satisfies Meta<typeof GroupsTab>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithInitialSegment: Story = {
  args: {
    initialSegmentType: 'role',
    initialSegmentValue: 'Manager',
  },
};
