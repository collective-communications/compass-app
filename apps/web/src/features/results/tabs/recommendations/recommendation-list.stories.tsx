import type { Meta, StoryObj } from '@storybook/react-vite';
import { RecommendationList } from './recommendation-list';
import type { Recommendation } from '../../types';

const recommendations: Recommendation[] = [
  {
    id: 'rec-001',
    dimensionCode: 'core',
    severity: 'critical',
    title: 'Rebuild Psychological Safety Foundation',
    body: 'Core dimension scores indicate a significant trust deficit.',
    actions: ['Conduct anonymous pulse check', 'Launch skip-level conversations'],
    cccServiceLink: 'https://collectivecommunication.ca/services/culture-assessment',
    trustLadderLink: '#trust-ladder',
    priority: 1,
  },
  {
    id: 'rec-002',
    dimensionCode: 'clarity',
    severity: 'high',
    title: 'Strengthen Strategic Communication Cadence',
    body: 'Clarity scores reveal a disconnect between leadership intent and employee understanding.',
    actions: ['Implement bi-weekly leadership updates'],
    cccServiceLink: null,
    trustLadderLink: null,
    priority: 2,
  },
  {
    id: 'rec-003',
    dimensionCode: 'collaboration',
    severity: 'medium',
    title: 'Enhance Cross-Functional Collaboration',
    body: 'Collaboration scores suggest siloed working patterns.',
    actions: ['Designate cross-functional project sponsors'],
    cccServiceLink: null,
    trustLadderLink: null,
    priority: 3,
  },
];

const meta = {
  title: 'Features/Results/Recommendations/RecommendationList',
  component: RecommendationList,
  args: {
    recommendations,
    activeFilter: 'all',
  },
} satisfies Meta<typeof RecommendationList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const FilteredCritical: Story = {
  args: { activeFilter: 'critical' },
};

export const FilteredHigh: Story = {
  args: { activeFilter: 'high' },
};

export const FilteredMedium: Story = {
  args: { activeFilter: 'medium' },
};

export const Empty: Story = {
  args: { recommendations: [] },
};
