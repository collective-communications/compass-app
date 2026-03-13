import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { DimensionNav } from './dimension-nav';
import type { DimensionScoreMap, RiskFlag } from '@compass/scoring';

const mockScores: DimensionScoreMap = {
  core: { dimensionId: 'd1', dimensionCode: 'core', score: 82, rawScore: 3.28, responseCount: 142 },
  clarity: { dimensionId: 'd2', dimensionCode: 'clarity', score: 68, rawScore: 2.72, responseCount: 142 },
  connection: { dimensionId: 'd3', dimensionCode: 'connection', score: 54, rawScore: 2.16, responseCount: 142 },
  collaboration: { dimensionId: 'd4', dimensionCode: 'collaboration', score: 75, rawScore: 3.0, responseCount: 142 },
};

const mockRiskFlags: RiskFlag[] = [
  { dimensionCode: 'connection', dimensionName: 'Connection', severity: 'high', score: 54, message: 'Connection scores below threshold.' },
  { dimensionCode: 'clarity', dimensionName: 'Clarity', severity: 'medium', score: 68, message: 'Clarity trending downward.' },
];

const meta = {
  title: 'Features/Results/Compass/DimensionNav',
  component: DimensionNav,
  args: {
    onSelect: fn(),
  },
} satisfies Meta<typeof DimensionNav>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OverviewSelected: Story = {
  args: {
    scores: mockScores,
    riskFlags: mockRiskFlags,
    activeDimension: 'overview',
  },
};

export const CoreSelected: Story = {
  args: {
    scores: mockScores,
    riskFlags: mockRiskFlags,
    activeDimension: 'core',
  },
};

export const ConnectionSelected: Story = {
  args: {
    scores: mockScores,
    riskFlags: mockRiskFlags,
    activeDimension: 'connection',
  },
};

export const NoRiskFlags: Story = {
  args: {
    scores: mockScores,
    riskFlags: [],
    activeDimension: 'overview',
  },
};
