import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { SegmentFilterBar } from './segment-filter-bar';

const meta = {
  title: 'Features/Results/Groups/SegmentFilterBar',
  component: SegmentFilterBar,
  args: {
    segmentType: 'department',
    segmentValue: 'all',
    segmentValues: ['Engineering', 'Marketing', 'Operations', 'Sales', 'HR'],
    belowThresholdValues: new Set(['HR']),
    onTypeChange: fn(),
    onValueChange: fn(),
  },
} satisfies Meta<typeof SegmentFilterBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SegmentSelected: Story = {
  args: { segmentValue: 'Engineering' },
};

export const BelowThresholdSelected: Story = {
  args: { segmentValue: 'HR' },
};

export const RoleSegment: Story = {
  args: {
    segmentType: 'role',
    segmentValues: ['Individual Contributor', 'Manager', 'Director', 'VP'],
    belowThresholdValues: new Set(['VP']),
  },
};

export const NoSegmentsBelowThreshold: Story = {
  args: {
    belowThresholdValues: new Set(),
  },
};

export const ManySegments: Story = {
  args: {
    segmentValues: [
      'Engineering', 'Marketing', 'Operations', 'Sales', 'HR',
      'Finance', 'Legal', 'Customer Success', 'Product', 'Design',
    ],
    belowThresholdValues: new Set(['Legal', 'Design']),
  },
};
