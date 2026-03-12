import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { DimensionFilterPills } from './dimension-filter-pills';

const meta = {
  title: 'Features/Results/Dialogue/DimensionFilterPills',
  component: DimensionFilterPills,
  args: {
    active: null,
    onChange: fn(),
  },
} satisfies Meta<typeof DimensionFilterPills>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CoreSelected: Story = {
  args: { active: 'core' },
};

export const ClaritySelected: Story = {
  args: { active: 'clarity' },
};

export const ConnectionSelected: Story = {
  args: { active: 'connection' },
};

export const CollaborationSelected: Story = {
  args: { active: 'collaboration' },
};
