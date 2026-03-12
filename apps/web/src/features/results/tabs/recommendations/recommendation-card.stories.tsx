import type { Meta, StoryObj } from '@storybook/react';
import { RecommendationCard } from './recommendation-card';
import type { Recommendation } from '../../types';

const criticalRec: Recommendation = {
  id: 'rec-001',
  dimensionCode: 'core',
  severity: 'critical',
  title: 'Rebuild Psychological Safety Foundation',
  body: 'Core dimension scores indicate a significant trust deficit. Employees report discomfort raising concerns with leadership, which undermines the foundation for all other cultural improvements.',
  actions: [
    'Conduct anonymous pulse check on psychological safety within 2 weeks',
    'Launch monthly skip-level conversations between SLT and front-line teams',
    'Establish a formal "no retaliation" policy with visible accountability mechanisms',
  ],
  cccServiceLink: 'https://collectivecommunication.ca/services/culture-assessment',
  trustLadderLink: '#trust-ladder',
  priority: 1,
};

const highRec: Recommendation = {
  id: 'rec-002',
  dimensionCode: 'clarity',
  severity: 'high',
  title: 'Strengthen Strategic Communication Cadence',
  body: 'Clarity scores reveal a disconnect between leadership intent and employee understanding. Teams lack visibility into how their work connects to organizational goals.',
  actions: [
    'Implement bi-weekly leadership updates with clear "what this means for you" framing',
    'Create visual strategy maps linking team objectives to company priorities',
  ],
  cccServiceLink: 'https://collectivecommunication.ca/services/strategic-communication',
  trustLadderLink: null,
  priority: 2,
};

const mediumRec: Recommendation = {
  id: 'rec-003',
  dimensionCode: 'collaboration',
  severity: 'medium',
  title: 'Enhance Cross-Functional Collaboration',
  body: 'Collaboration scores suggest siloed working patterns. While intra-team dynamics are healthy, cross-departmental initiatives lack structured support.',
  actions: [
    'Designate cross-functional project sponsors from the SLT',
    'Pilot a quarterly "connection circles" program across three departments',
  ],
  cccServiceLink: null,
  trustLadderLink: null,
  priority: 3,
};

const healthyRec: Recommendation = {
  id: 'rec-004',
  dimensionCode: 'connection',
  severity: 'healthy',
  title: 'Maintain Recognition Momentum',
  body: 'Connection scores are strong. The existing recognition program is effective — continue and expand it to sustain positive cultural momentum.',
  actions: [],
  cccServiceLink: null,
  trustLadderLink: null,
  priority: 4,
};

const meta = {
  title: 'Features/Results/Recommendations/RecommendationCard',
  component: RecommendationCard,
  args: {
    recommendation: criticalRec,
  },
} satisfies Meta<typeof RecommendationCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Critical: Story = {};

export const High: Story = {
  args: { recommendation: highRec },
};

export const Medium: Story = {
  args: { recommendation: mediumRec },
};

export const Healthy: Story = {
  args: { recommendation: healthyRec },
};

export const WithServiceLinks: Story = {
  args: { recommendation: criticalRec },
};

export const NoActions: Story = {
  args: { recommendation: healthyRec },
};

export const AllSeverities: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <RecommendationCard recommendation={criticalRec} />
      <RecommendationCard recommendation={highRec} />
      <RecommendationCard recommendation={mediumRec} />
      <RecommendationCard recommendation={healthyRec} />
    </div>
  ),
};
