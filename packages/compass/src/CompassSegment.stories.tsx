import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { CompassSegment } from './CompassSegment';

const SVG_SIZE = 344;
const CX = SVG_SIZE / 2;
const CY = SVG_SIZE / 2;
const MAX_RADIUS = SVG_SIZE / 2 - 16;
const CORE_RADIUS = MAX_RADIUS * 0.22;

const meta = {
  title: 'Packages/Compass/CompassSegment',
  component: CompassSegment,
  args: {
    dimension: 'clarity',
    score: 65,
    color: '#FF7F50',
    label: 'Clarity',
    cx: CX,
    cy: CY,
    maxRadius: MAX_RADIUS,
    coreRadius: CORE_RADIUS,
    selectedSegment: null,
    animated: false,
    onClick: fn(),
    onHover: fn(),
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
} satisfies Meta<typeof CompassSegment>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Connection: Story = {
  args: {
    dimension: 'connection',
    score: 81,
    color: '#9FD7C3',
    label: 'Connection',
  },
};

export const Collaboration: Story = {
  args: {
    dimension: 'collaboration',
    score: 54,
    color: '#E8B4A8',
    label: 'Collaboration',
  },
};

export const HighScore: Story = {
  args: { score: 95 },
};

export const LowScore: Story = {
  args: { score: 15 },
};

export const Selected: Story = {
  args: { selectedSegment: 'clarity' },
};

export const Deselected: Story = {
  args: { selectedSegment: 'connection' },
};

export const Animated: Story = {
  args: { animated: true },
};
