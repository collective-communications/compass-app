import type { Meta, StoryObj } from '@storybook/react-vite';
import { ReferenceRings } from './ReferenceRings';

const SVG_SIZE = 344;
const CX = SVG_SIZE / 2;
const CY = SVG_SIZE / 2;
const MAX_RADIUS = SVG_SIZE / 2 - 16;
const CORE_RADIUS = MAX_RADIUS * 0.22;

const meta = {
  title: 'Packages/Compass/ReferenceRings',
  component: ReferenceRings,
  args: {
    cx: CX,
    cy: CY,
    maxRadius: MAX_RADIUS,
    coreRadius: CORE_RADIUS,
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
} satisfies Meta<typeof ReferenceRings>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LargeCoreRadius: Story = {
  args: { coreRadius: MAX_RADIUS * 0.4 },
};

export const SmallCompass: Story = {
  args: {
    cx: 100,
    cy: 100,
    maxRadius: 84,
    coreRadius: 84 * 0.22,
  },
  decorators: [
    (Story) => (
      <svg viewBox="0 0 200 200" width={200} height={200}>
        <Story />
      </svg>
    ),
  ],
};
