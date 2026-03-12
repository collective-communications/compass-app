import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { RecommendationNav } from './severity-filter';
import type { Recommendation } from '../../types';

const recommendations: Recommendation[] = [
  {
    id: 'rec-001',
    dimensionCode: 'core',
    severity: 'critical',
    title: 'Rebuild Psychological Safety Foundation',
    body: 'Core dimension scores indicate a trust deficit.',
    actions: [],
    cccServiceLink: null,
    trustLadderLink: null,
    priority: 1,
  },
  {
    id: 'rec-002',
    dimensionCode: 'clarity',
    severity: 'high',
    title: 'Strengthen Strategic Communication Cadence',
    body: 'Clarity scores reveal a disconnect.',
    actions: [],
    cccServiceLink: null,
    trustLadderLink: null,
    priority: 2,
  },
  {
    id: 'rec-003',
    dimensionCode: 'collaboration',
    severity: 'medium',
    title: 'Enhance Cross-Functional Collaboration',
    body: 'Collaboration scores suggest siloed patterns.',
    actions: [],
    cccServiceLink: null,
    trustLadderLink: null,
    priority: 3,
  },
  {
    id: 'rec-004',
    dimensionCode: 'connection',
    severity: 'medium',
    title: 'Formalize Peer Recognition',
    body: 'Informal recognition exists but lacks structure.',
    actions: [],
    cccServiceLink: null,
    trustLadderLink: null,
    priority: 4,
  },
];

const meta = {
  title: 'Features/Results/Recommendations/SeverityFilter',
  component: RecommendationNav,
  args: {
    recommendations,
    activeIndex: 0,
    onSelect: fn(),
  },
} satisfies Meta<typeof RecommendationNav>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SecondSelected: Story = {
  args: { activeIndex: 1 },
};

export const LastSelected: Story = {
  args: { activeIndex: 3 },
};

export const SingleRecommendation: Story = {
  args: {
    recommendations: [recommendations[0]!],
    activeIndex: 0,
  },
};
