import type { Meta, StoryObj } from '@storybook/react-vite';
import { StackedComparisonChart } from './stacked-comparison-chart';
import type { DimensionScoreRow } from '../../types';
import type { DimensionScoreMap } from '@compass/scoring';
import type { DimensionCode } from '@compass/types';

const overallScores: DimensionScoreMap = {
  core: { score: 68, rawScore: 2.72, responseCount: 120 },
  clarity: { score: 62, rawScore: 2.48, responseCount: 120 },
  connection: { score: 75, rawScore: 3.0, responseCount: 120 },
  collaboration: { score: 58, rawScore: 2.32, responseCount: 120 },
};

const dims: DimensionCode[] = ['core', 'clarity', 'connection', 'collaboration'];

function makeSegmentRows(
  segments: Record<string, Record<string, number>>,
): DimensionScoreRow[] {
  const rows: DimensionScoreRow[] = [];
  for (const [seg, scores] of Object.entries(segments)) {
    for (const dim of dims) {
      rows.push({
        surveyId: 'survey-001',
        segmentType: 'department',
        segmentValue: seg,
        dimensionCode: dim,
        isMasked: false,
        score: scores[dim] ?? 50,
        rawScore: (scores[dim] ?? 50) / 25,
        responseCount: 30,
      });
    }
  }
  return rows;
}

const meta = {
  title: 'Features/Results/Groups/StackedComparisonChart',
  component: StackedComparisonChart,
  args: {
    segmentRows: makeSegmentRows({
      Engineering: { core: 78, clarity: 70, connection: 82, collaboration: 65 },
      Marketing: { core: 60, clarity: 72, connection: 68, collaboration: 55 },
      Sales: { core: 55, clarity: 50, connection: 70, collaboration: 48 },
    }),
    overallScores,
    belowThresholdValues: new Set<string>(),
  },
} satisfies Meta<typeof StackedComparisonChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithBelowThreshold: Story = {
  args: {
    segmentRows: makeSegmentRows({
      Engineering: { core: 78, clarity: 70, connection: 82, collaboration: 65 },
      Marketing: { core: 60, clarity: 72, connection: 68, collaboration: 55 },
      HR: { core: 0, clarity: 0, connection: 0, collaboration: 0 },
    }),
    belowThresholdValues: new Set(['HR']),
  },
};

export const ManySegments: Story = {
  args: {
    segmentRows: makeSegmentRows({
      Engineering: { core: 78, clarity: 70, connection: 82, collaboration: 65 },
      Marketing: { core: 60, clarity: 72, connection: 68, collaboration: 55 },
      Sales: { core: 55, clarity: 50, connection: 70, collaboration: 48 },
      Operations: { core: 72, clarity: 64, connection: 76, collaboration: 60 },
      Finance: { core: 80, clarity: 75, connection: 70, collaboration: 68 },
      Product: { core: 85, clarity: 80, connection: 88, collaboration: 72 },
    }),
  },
};
