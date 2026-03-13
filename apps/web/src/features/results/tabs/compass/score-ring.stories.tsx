import type { Meta, StoryObj } from '@storybook/react-vite';
import { ScoreRing } from './score-ring';

const meta = {
  title: 'Features/Results/Compass/ScoreRing',
  component: ScoreRing,
} satisfies Meta<typeof ScoreRing>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Core: Story = {
  args: { score: 82, color: '#0A3B4F' },
};

export const Clarity: Story = {
  args: { score: 68, color: '#FF7F50' },
};

export const Connection: Story = {
  args: { score: 54, color: '#9FD7C3' },
};

export const Collaboration: Story = {
  args: { score: 75, color: '#E8B4A8' },
};

export const FullScore: Story = {
  args: { score: 100, color: '#0A3B4F' },
};

export const ZeroScore: Story = {
  args: { score: 0, color: '#FF7F50' },
};

export const LargeRing: Story = {
  args: { score: 72, color: '#0A3B4F', size: 96, strokeWidth: 8 },
};

export const SmallWithoutLabel: Story = {
  args: { score: 65, color: '#9FD7C3', size: 28, strokeWidth: 3, showLabel: false },
};
