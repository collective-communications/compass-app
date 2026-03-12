import type { Meta, StoryObj } from '@storybook/react';
import { CompassCore } from './CompassCore';

const SVG_SIZE = 200;
const CX = SVG_SIZE / 2;
const CY = SVG_SIZE / 2;

const meta = {
  title: 'Packages/Compass/CompassCore',
  component: CompassCore,
  args: {
    cx: CX,
    cy: CY,
    radius: 40,
    color: '#0A3B4F',
    score: 72,
  },
  decorators: [
    (Story) => (
      <svg viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`} width={SVG_SIZE} height={SVG_SIZE}>
        <Story />
      </svg>
    ),
  ],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof CompassCore>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const HighScore: Story = {
  args: { score: 95 },
};

export const LowScore: Story = {
  args: { score: 12 },
};

export const LargeRadius: Story = {
  args: { radius: 70 },
};

export const ClarityColor: Story = {
  args: { color: '#FF7F50', score: 65 },
};
