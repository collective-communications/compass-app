import type { Meta, StoryObj } from '@storybook/react';
import { SegmentComparison } from './segment-comparison';

const meta = {
  title: 'Features/Results/SegmentComparison',
  component: SegmentComparison,
  decorators: [(Story) => <div style={{ maxWidth: 500 }}><Story /></div>],
} satisfies Meta<typeof SegmentComparison>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    segments: [
      { segmentLabel: 'Engineering', dimensionCode: 'core', score: 3.4, overallScore: 3.1, isBelowThreshold: false },
      { segmentLabel: 'Marketing', dimensionCode: 'core', score: 2.8, overallScore: 3.1, isBelowThreshold: false },
      { segmentLabel: 'Operations', dimensionCode: 'core', score: 3.2, overallScore: 3.1, isBelowThreshold: false },
      { segmentLabel: 'Finance', dimensionCode: 'core', score: 2.5, overallScore: 3.1, isBelowThreshold: false },
    ],
  },
};

export const WithHiddenSegment: Story = {
  args: {
    segments: [
      { segmentLabel: 'Engineering', dimensionCode: 'clarity', score: 3.6, overallScore: 3.2, isBelowThreshold: false },
      { segmentLabel: 'Executive Team', dimensionCode: 'clarity', score: 0, overallScore: 3.2, isBelowThreshold: true },
      { segmentLabel: 'Marketing', dimensionCode: 'clarity', score: 2.9, overallScore: 3.2, isBelowThreshold: false },
    ],
  },
};

export const AllBelowThreshold: Story = {
  args: {
    segments: [
      { segmentLabel: 'Team A', dimensionCode: 'connection', score: 0, overallScore: 3.0, isBelowThreshold: true },
      { segmentLabel: 'Team B', dimensionCode: 'connection', score: 0, overallScore: 3.0, isBelowThreshold: true },
    ],
  },
};

export const CustomAnonymityMessage: Story = {
  args: {
    segments: [
      { segmentLabel: 'Small Team', dimensionCode: 'collaboration', score: 0, overallScore: 3.0, isBelowThreshold: true },
    ],
    anonymityMessage: 'Fewer than 5 responses — data hidden to protect anonymity.',
  },
};

export const MixedDeltas: Story = {
  args: {
    segments: [
      { segmentLabel: 'Product', dimensionCode: 'core', score: 3.8, overallScore: 3.1, isBelowThreshold: false },
      { segmentLabel: 'Sales', dimensionCode: 'core', score: 2.2, overallScore: 3.1, isBelowThreshold: false },
      { segmentLabel: 'Design', dimensionCode: 'core', score: 3.1, overallScore: 3.1, isBelowThreshold: false },
    ],
  },
};
