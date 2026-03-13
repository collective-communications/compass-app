import type { Meta, StoryObj } from '@storybook/react-vite';
import { DimensionDetailPanel } from './dimension-detail-panel';
import type { DimensionScoreMap, RiskFlag } from '@compass/scoring';

const mockScores: DimensionScoreMap = {
  core: { dimensionId: 'd1', dimensionCode: 'core', score: 82, rawScore: 3.28, responseCount: 142 },
  clarity: { dimensionId: 'd2', dimensionCode: 'clarity', score: 68, rawScore: 2.72, responseCount: 142 },
  connection: { dimensionId: 'd3', dimensionCode: 'connection', score: 54, rawScore: 2.16, responseCount: 142 },
  collaboration: { dimensionId: 'd4', dimensionCode: 'collaboration', score: 75, rawScore: 3.0, responseCount: 142 },
};

const mockRiskFlags: RiskFlag[] = [
  { dimensionCode: 'connection', dimensionName: 'Connection', severity: 'high', score: 54, message: 'Connection scores indicate weak interpersonal bonds and low belonging. Consider team-building initiatives.' },
  { dimensionCode: 'clarity', dimensionName: 'Clarity', severity: 'medium', score: 68, message: 'Clarity is trending downward. Review communication channels.' },
];

const meta = {
  title: 'Features/Results/Compass/DimensionDetailPanel',
  component: DimensionDetailPanel,
  decorators: [(Story) => <div style={{ maxWidth: 360 }}><Story /></div>],
} satisfies Meta<typeof DimensionDetailPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  args: { dimension: 'overview', scores: mockScores, riskFlags: mockRiskFlags },
};

export const Core: Story = {
  args: { dimension: 'core', scores: mockScores, riskFlags: mockRiskFlags },
};

export const ConnectionWithRisk: Story = {
  args: { dimension: 'connection', scores: mockScores, riskFlags: mockRiskFlags },
};

export const ClarityWithRisk: Story = {
  args: { dimension: 'clarity', scores: mockScores, riskFlags: mockRiskFlags },
};

export const CollaborationHealthy: Story = {
  args: { dimension: 'collaboration', scores: mockScores, riskFlags: mockRiskFlags },
};
