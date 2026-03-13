import type { Meta, StoryObj } from '@storybook/react-vite';
import { CoreHealthIndicator } from './core-health-indicator';

const meta = {
  title: 'Features/Results/Compass/CoreHealthIndicator',
  component: CoreHealthIndicator,
} satisfies Meta<typeof CoreHealthIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Healthy: Story = {
  args: { coreScore: 82 },
};

export const Fragile: Story = {
  args: { coreScore: 58 },
};

export const Broken: Story = {
  args: { coreScore: 35 },
};

export const BoundaryHealthy: Story = {
  args: { coreScore: 70 },
};

export const BoundaryFragile: Story = {
  args: { coreScore: 50 },
};
