import type { Meta, StoryObj } from '@storybook/react-vite';
import { TrendIndicator } from './trend-indicator';

const meta = {
  title: 'Features/Results/TrendIndicator',
  component: TrendIndicator,
} satisfies Meta<typeof TrendIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Positive: Story = {
  args: { delta: 12 },
};

export const Negative: Story = {
  args: { delta: -8 },
};

export const NoChange: Story = {
  args: { delta: 0 },
};

export const NullDelta: Story = {
  args: { delta: null },
};

export const SmallPositive: Story = {
  args: { delta: 2, size: 'sm' },
};

export const LargeNegative: Story = {
  args: { delta: -25, size: 'md' },
};
