import type { Meta, StoryObj } from '@storybook/react-vite';
import { RecommendationCard } from './recommendation-card';

const meta = {
  title: 'Features/Results/RecommendationCard',
  component: RecommendationCard,
  decorators: [(Story) => <div style={{ maxWidth: 500 }}><Story /></div>],
} satisfies Meta<typeof RecommendationCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Critical: Story = {
  args: {
    title: 'Rebuild Psychological Safety',
    description:
      'Core scores indicate a significant erosion of trust. Without intervention, outer dimensions will continue to decline.',
    severity: 'critical',
    dimension: 'Core',
    actions: [
      'Conduct confidential listening sessions with each team',
      'Establish a zero-retaliation reporting channel',
      'SLT to model vulnerability in next all-hands',
    ],
  },
};

export const High: Story = {
  args: {
    title: 'Clarify Strategic Priorities',
    description:
      'Clarity scores suggest employees are unclear on organizational direction and how their work contributes.',
    severity: 'high',
    dimension: 'Clarity',
    actions: [
      'Publish quarterly strategic priorities document',
      'Cascade goals through each department within 2 weeks',
    ],
  },
};

export const Medium: Story = {
  args: {
    title: 'Strengthen Cross-Team Communication',
    description:
      'Connection scores show moderate gaps in inter-team relationships and belonging.',
    severity: 'medium',
    dimension: 'Connection',
    actions: [
      'Introduce cross-functional project pairings',
      'Schedule monthly informal team mixers',
      'Launch a peer recognition program',
    ],
  },
};

export const Healthy: Story = {
  args: {
    title: 'Maintain Collaborative Momentum',
    description:
      'Collaboration scores are strong. Continue current practices to sustain this strength.',
    severity: 'healthy',
    dimension: 'Collaboration',
    actions: ['Document and share current collaboration best practices'],
  },
};

export const NoActions: Story = {
  args: {
    title: 'Monitor Connection Trends',
    description:
      'Connection is within healthy range but trending downward. Monitor closely next quarter.',
    severity: 'medium',
    dimension: 'Connection',
    actions: [],
  },
};
