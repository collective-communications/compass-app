import type { Meta, StoryObj } from '@storybook/react-vite';
import { ResultsSkeleton } from './results-skeleton';

const meta = {
  title: 'Features/Results/ResultsSkeleton',
  component: ResultsSkeleton,
} satisfies Meta<typeof ResultsSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
