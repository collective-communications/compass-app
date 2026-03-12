import type { Meta, StoryObj } from '@storybook/react';
import { GapIndicator } from './GapIndicator';

const SVG_SIZE = 344;
const CX = SVG_SIZE / 2;
const CY = SVG_SIZE / 2;

const meta = {
  title: 'Packages/Compass/GapIndicator',
  component: GapIndicator,
  args: {
    cx: CX,
    cy: CY,
    radius: SVG_SIZE / 2 - 16,
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
} satisfies Meta<typeof GapIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SmallRadius: Story = {
  args: { radius: 80 },
};

export const LargeRadius: Story = {
  args: { radius: 160 },
};
