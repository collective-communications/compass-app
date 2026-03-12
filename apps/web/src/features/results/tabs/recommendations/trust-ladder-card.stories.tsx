import type { Meta, StoryObj } from '@storybook/react';
import { TrustLadderCard } from './trust-ladder-card';

const meta = {
  title: 'Features/Results/Recommendations/TrustLadderCard',
  component: TrustLadderCard,
  args: {
    surveyId: 'survey-001',
  },
  parameters: {
    docs: {
      description: {
        component:
          'Wrapper card that fetches Trust Ladder data via useTrustLadder hook. Requires QueryClientProvider and a Supabase session. Shows loading skeleton or error state when data is unavailable.',
      },
    },
  },
} satisfies Meta<typeof TrustLadderCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Renders loading skeleton while data is being fetched. */
export const Default: Story = {};
