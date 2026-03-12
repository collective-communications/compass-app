import type { Meta, StoryObj } from '@storybook/react';
import { RecommendationsTab, RecommendationsInsightsContent } from './recommendations-tab';

const meta = {
  title: 'Features/Results/Recommendations/RecommendationsTab',
  component: RecommendationsTab,
  args: {
    surveyId: 'survey-001',
  },
  parameters: {
    docs: {
      description: {
        component:
          'Composite tab component that fetches recommendations via useRecommendations hook. Requires QueryClientProvider and a Supabase session. Shows loading skeleton while data is being fetched.',
      },
    },
  },
} satisfies Meta<typeof RecommendationsTab>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Renders loading skeleton while data is being fetched. */
export const Default: Story = {};

/** Insights panel content (fetches Trust Ladder and shows service links). */
export const InsightsContent: Story = {
  render: () => <RecommendationsInsightsContent surveyId="survey-001" />,
};
