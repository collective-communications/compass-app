import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { KeyFindingsPanel } from './key-findings-panel';
import type { DimensionScoreMap, RiskFlag } from '@compass/scoring';

const mockScores: DimensionScoreMap = {
  core: { dimensionId: 'd1', dimensionCode: 'core', score: 82, rawScore: 3.28, responseCount: 142 },
  clarity: { dimensionId: 'd2', dimensionCode: 'clarity', score: 68, rawScore: 2.72, responseCount: 142 },
  connection: { dimensionId: 'd3', dimensionCode: 'connection', score: 54, rawScore: 2.16, responseCount: 142 },
  collaboration: { dimensionId: 'd4', dimensionCode: 'collaboration', score: 75, rawScore: 3.0, responseCount: 142 },
};

const mockRiskFlags: RiskFlag[] = [
  { dimensionCode: 'connection', dimensionName: 'Connection', severity: 'high', score: 54, message: 'Connection scores below threshold — address interpersonal bonds.' },
  { dimensionCode: 'clarity', dimensionName: 'Clarity', severity: 'medium', score: 68, message: 'Clarity trending downward — review strategic communication.' },
];

const meta = {
  title: 'Features/Results/Compass/KeyFindingsPanel',
  component: KeyFindingsPanel,
  decorators: [(Story) => <div style={{ maxWidth: 360 }}><Story /></div>],
} satisfies Meta<typeof KeyFindingsPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    scores: mockScores,
    riskFlags: mockRiskFlags,
  },
};

export const WithViewRecommendations: Story = {
  args: {
    scores: mockScores,
    riskFlags: mockRiskFlags,
    onViewRecommendations: fn(),
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
    riskFlags: [
      { dimensionCode: 'core', dimensionName: 'Core', severity: 'healthy', score: 85, message: 'Core is healthy.' },
      { dimensionCode: 'clarity', dimensionName: 'Clarity', severity: 'healthy', score: 80, message: 'Clarity is healthy.' },
    ],
  },
};
