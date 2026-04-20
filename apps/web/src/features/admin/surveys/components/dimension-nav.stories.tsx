import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import type { Dimension } from '@compass/types';
import { DimensionNav } from './dimension-nav';

const dimensions: Dimension[] = [
  { id: 'dim-core', code: 'core', name: 'Core', description: null, color: '#0C3D50', displayOrder: 1, segmentStartAngle: null, segmentEndAngle: null, createdAt: '' },
  { id: 'dim-clarity', code: 'clarity', name: 'Clarity', description: null, color: '#FF7F50', displayOrder: 2, segmentStartAngle: null, segmentEndAngle: null, createdAt: '' },
  { id: 'dim-connection', code: 'connection', name: 'Connection', description: null, color: '#9FD7C3', displayOrder: 3, segmentStartAngle: null, segmentEndAngle: null, createdAt: '' },
  { id: 'dim-collaboration', code: 'collaboration', name: 'Collaboration', description: null, color: '#E8B4A8', displayOrder: 4, segmentStartAngle: null, segmentEndAngle: null, createdAt: '' },
];

const questionCounts: Record<string, number> = {
  'dim-core': 8,
  'dim-clarity': 6,
  'dim-connection': 7,
  'dim-collaboration': 5,
};

const meta = {
  title: 'Features/Admin/Surveys/DimensionNav',
  component: DimensionNav,
  args: {
    dimensions,
    activeDimensionId: null,
    onSelect: fn(),
    questionCounts,
  },
} satisfies Meta<typeof DimensionNav>;

export default meta;
type Story = StoryObj<typeof meta>;

/** All dimensions shown, "All" selected. */
export const Default: Story = {};

/** A specific dimension selected. */
export const DimensionSelected: Story = {
  args: {
    activeDimensionId: 'dim-clarity',
  },
};

/** Empty survey with no questions in any dimension. */
export const ZeroCounts: Story = {
  args: {
    questionCounts: {
      'dim-core': 0,
      'dim-clarity': 0,
      'dim-connection': 0,
      'dim-collaboration': 0,
    },
  },
};
