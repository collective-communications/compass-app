import type { Meta, StoryObj } from '@storybook/react';
import { SegmentCompass } from './segment-compass';
import type { DimensionScoreRow } from '../../types';

function makeRows(scores: Record<string, number>): DimensionScoreRow[] {
  return Object.entries(scores).map(([dim, score]) => ({
    surveyId: 'survey-001',
    segmentType: 'department',
    segmentValue: 'Engineering',
    dimensionCode: dim as DimensionScoreRow['dimensionCode'],
    isMasked: false,
    score,
    rawScore: score,
    responseCount: 45,
  }));
}

const meta = {
  title: 'Features/Results/Groups/SegmentCompass',
  component: SegmentCompass,
  args: {
    rows: makeRows({ core: 72, clarity: 65, connection: 81, collaboration: 54 }),
  },
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof SegmentCompass>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const HighScores: Story = {
  args: {
    rows: makeRows({ core: 92, clarity: 88, connection: 95, collaboration: 90 }),
  },
};

export const LowScores: Story = {
  args: {
    rows: makeRows({ core: 25, clarity: 30, connection: 18, collaboration: 22 }),
  },
};

export const Imbalanced: Story = {
  args: {
    rows: makeRows({ core: 85, clarity: 40, connection: 72, collaboration: 30 }),
  },
};
