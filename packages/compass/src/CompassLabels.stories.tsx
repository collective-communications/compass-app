import type { Meta, StoryObj } from '@storybook/react';
import { CompassLabels } from './CompassLabels';
import type { DimensionScore } from './types';

const SVG_SIZE = 400;
const CX = SVG_SIZE / 2;
const CY = SVG_SIZE / 2;

const scores: DimensionScore[] = [
  { dimension: 'core', score: 72, color: '#0A3B4F', label: 'Core' },
  { dimension: 'clarity', score: 65, color: '#FF7F50', label: 'Clarity' },
  { dimension: 'connection', score: 81, color: '#9FD7C3', label: 'Connection' },
  { dimension: 'collaboration', score: 54, color: '#E8B4A8', label: 'Collaboration' },
];

const meta = {
  title: 'Packages/Compass/CompassLabels',
  component: CompassLabels,
  args: {
    scores,
    cx: CX,
    cy: CY,
    labelRadius: 170,
  },
  decorators: [
    (Story) => (
      <svg
        viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
        width={SVG_SIZE}
        height={SVG_SIZE}
        style={{ overflow: 'visible' }}
      >
        {/* Reference circle to show label positioning context */}
        <circle cx={CX} cy={CY} r={156} fill="none" stroke="#E5E4E0" strokeDasharray="4 4" />
        <Story />
      </svg>
    ),
  ],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof CompassLabels>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const HighScores: Story = {
  args: {
    scores: [
      { dimension: 'core', score: 95, color: '#0A3B4F', label: 'Core' },
      { dimension: 'clarity', score: 92, color: '#FF7F50', label: 'Clarity' },
      { dimension: 'connection', score: 97, color: '#9FD7C3', label: 'Connection' },
      { dimension: 'collaboration', score: 90, color: '#E8B4A8', label: 'Collaboration' },
    ],
  },
};
