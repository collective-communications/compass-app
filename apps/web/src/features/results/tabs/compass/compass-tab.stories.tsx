import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { CompassTab } from './compass-tab';
import type { DimensionScoreMap, RiskFlag, ArchetypeMatch } from '@compass/scoring';

const mockScores: DimensionScoreMap = {
  core: { dimensionId: 'd1', dimensionCode: 'core', score: 82, rawScore: 3.28, responseCount: 142 },
  clarity: { dimensionId: 'd2', dimensionCode: 'clarity', score: 68, rawScore: 2.72, responseCount: 142 },
  connection: { dimensionId: 'd3', dimensionCode: 'connection', score: 54, rawScore: 2.16, responseCount: 142 },
  collaboration: { dimensionId: 'd4', dimensionCode: 'collaboration', score: 75, rawScore: 3.0, responseCount: 142 },
};

const mockArchetype: ArchetypeMatch = {
  archetype: {
    id: 'arch-1',
    code: 'collaborative-innovator',
    name: 'The Collaborative Innovator',
    description:
      'Organizations matching this archetype demonstrate strong cross-functional alignment and a culture of experimentation. Teams actively share knowledge and align around shared goals.',
    targetScores: { core: 80, clarity: 75, connection: 70, collaboration: 90 },
    displayOrder: 1,
  },
  distance: 5.2,
  confidence: 'strong',
};

const mockRiskFlags: RiskFlag[] = [
  { dimensionCode: 'connection', dimensionName: 'Connection', severity: 'high', score: 54, message: 'Connection scores below threshold.' },
  { dimensionCode: 'clarity', dimensionName: 'Clarity', severity: 'medium', score: 68, message: 'Clarity trending downward.' },
];

const meta = {
  title: 'Features/Results/Compass/CompassTab',
  component: CompassTab,
} satisfies Meta<typeof CompassTab>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    scores: mockScores,
    archetype: mockArchetype,
    riskFlags: mockRiskFlags,
  },
};

export const Controlled: Story = {
  args: {
    scores: mockScores,
    archetype: mockArchetype,
    riskFlags: mockRiskFlags,
    activeDimension: 'core',
    onDimensionChange: fn(),
  },
};

export const AllHealthy: Story = {
  args: {
    scores: {
      core: { dimensionId: 'd1', dimensionCode: 'core', score: 85, rawScore: 3.4, responseCount: 142 },
      clarity: { dimensionId: 'd2', dimensionCode: 'clarity', score: 80, rawScore: 3.2, responseCount: 142 },
      connection: { dimensionId: 'd3', dimensionCode: 'connection', score: 78, rawScore: 3.12, responseCount: 142 },
      collaboration: { dimensionId: 'd4', dimensionCode: 'collaboration', score: 82, rawScore: 3.28, responseCount: 142 },
    },
    archetype: mockArchetype,
    riskFlags: [
      { dimensionCode: 'core', dimensionName: 'Core', severity: 'healthy', score: 85, message: 'All dimensions healthy.' },
    ],
  },
};

export const CriticalCore: Story = {
  args: {
    scores: {
      core: { dimensionId: 'd1', dimensionCode: 'core', score: 32, rawScore: 1.28, responseCount: 142 },
      clarity: { dimensionId: 'd2', dimensionCode: 'clarity', score: 45, rawScore: 1.8, responseCount: 142 },
      connection: { dimensionId: 'd3', dimensionCode: 'connection', score: 38, rawScore: 1.52, responseCount: 142 },
      collaboration: { dimensionId: 'd4', dimensionCode: 'collaboration', score: 40, rawScore: 1.6, responseCount: 142 },
    },
    archetype: {
      ...mockArchetype,
      confidence: 'weak',
      distance: 28.5,
    },
    riskFlags: [
      { dimensionCode: 'core', dimensionName: 'Core', severity: 'critical', score: 32, message: 'Core trust critically low.' },
      { dimensionCode: 'connection', dimensionName: 'Connection', severity: 'high', score: 38, message: 'Connection severely impacted.' },
      { dimensionCode: 'collaboration', dimensionName: 'Collaboration', severity: 'high', score: 40, message: 'Collaboration below threshold.' },
    ],
  },
};
