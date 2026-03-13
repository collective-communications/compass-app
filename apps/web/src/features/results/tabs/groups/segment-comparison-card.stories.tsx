import type { Meta, StoryObj } from '@storybook/react-vite';
import { SegmentComparisonCard } from './segment-comparison-card';
import type { DimensionScoreRow } from '../../types';
import type { DimensionScoreMap } from '@compass/scoring';

const overallScores: DimensionScoreMap = {
  core: { score: 68, rawScore: 2.72, responseCount: 120 },
  clarity: { score: 62, rawScore: 2.48, responseCount: 120 },
  connection: { score: 75, rawScore: 3.0, responseCount: 120 },
  collaboration: { score: 58, rawScore: 2.32, responseCount: 120 },
};

function makeSegmentRows(
  label: string,
  scores: Record<string, number>,
): DimensionScoreRow[] {
  return Object.entries(scores).map(([dim, score]) => ({
    surveyId: 'survey-001',
    segmentType: 'department',
    segmentValue: label,
    dimensionCode: dim as DimensionScoreRow['dimensionCode'],
    isMasked: false,
    score,
    rawScore: score / 25,
    responseCount: 30,
  }));
}

const meta = {
  title: 'Features/Results/Groups/SegmentComparisonCard',
  component: SegmentComparisonCard,
  args: {
    segmentLabel: 'Engineering',
    segmentRows: makeSegmentRows('Engineering', {
      core: 78, clarity: 70, connection: 82, collaboration: 65,
    }),
    overallScores,
  },
} satisfies Meta<typeof SegmentComparisonCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AboveOverall: Story = {
  args: {
    segmentLabel: 'Product',
    segmentRows: makeSegmentRows('Product', {
      core: 82, clarity: 78, connection: 88, collaboration: 75,
    }),
  },
};

export const BelowOverall: Story = {
  args: {
    segmentLabel: 'Sales',
    segmentRows: makeSegmentRows('Sales', {
      core: 52, clarity: 45, connection: 60, collaboration: 40,
    }),
  },
};

export const LargeDelta: Story = {
  args: {
    segmentLabel: 'Operations',
    segmentRows: makeSegmentRows('Operations', {
      core: 90, clarity: 40, connection: 75, collaboration: 30,
    }),
  },
};
