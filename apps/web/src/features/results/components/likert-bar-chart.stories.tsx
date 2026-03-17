import type { Meta, StoryObj } from '@storybook/react-vite';
import { LikertBarChart } from './likert-bar-chart';

const meta = {
  title: 'Features/Results/LikertBarChart',
  component: LikertBarChart,
  decorators: [(Story) => <div style={{ maxWidth: 400 }}><Story /></div>],
} satisfies Meta<typeof LikertBarChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    distribution: { 1: 5, 2: 10, 3: 35, 4: 50 },
    agreeColor: '#0A3B4F',
    scaleSize: 4,
  },
};

export const FivePointScale: Story = {
  args: {
    distribution: { 1: 3, 2: 8, 3: 15, 4: 35, 5: 39 },
    agreeColor: '#0A3B4F',
    scaleSize: 5,
  },
};

export const CoreDimension: Story = {
  args: {
    distribution: { 1: 3, 2: 8, 3: 40, 4: 49 },
    agreeColor: '#0A3B4F',
    scaleSize: 4,
  },
};

export const ClarityDimension: Story = {
  args: {
    distribution: { 1: 12, 2: 18, 3: 38, 4: 32 },
    agreeColor: '#FF7F50',
    scaleSize: 4,
  },
};

export const ConnectionDimension: Story = {
  args: {
    distribution: { 1: 20, 2: 25, 3: 30, 4: 25 },
    agreeColor: '#9FD7C3',
    scaleSize: 4,
  },
};

export const CollaborationDimension: Story = {
  args: {
    distribution: { 1: 8, 2: 12, 3: 42, 4: 38 },
    agreeColor: '#E8B4A8',
    scaleSize: 4,
  },
};

export const HighlyPositive: Story = {
  args: {
    distribution: { 1: 1, 2: 2, 3: 20, 4: 77 },
    agreeColor: '#0A3B4F',
    scaleSize: 4,
  },
};

export const HighlyNegative: Story = {
  args: {
    distribution: { 1: 45, 2: 30, 3: 15, 4: 10 },
    agreeColor: '#FF7F50',
    scaleSize: 4,
  },
};

export const FivePointHighlyPositive: Story = {
  args: {
    distribution: { 1: 1, 2: 2, 3: 5, 4: 30, 5: 62 },
    agreeColor: '#0A3B4F',
    scaleSize: 5,
  },
};

export const SevenPointScale: Story = {
  args: {
    distribution: { 1: 3, 2: 5, 3: 10, 4: 20, 5: 25, 6: 22, 7: 15 },
    agreeColor: '#9FD7C3',
    scaleSize: 7,
  },
};

export const WithoutLabels: Story = {
  args: {
    distribution: { 1: 10, 2: 15, 3: 35, 4: 40 },
    agreeColor: '#0A3B4F',
    scaleSize: 4,
    showLabels: false,
  },
};

export const CustomHeight: Story = {
  args: {
    distribution: { 1: 10, 2: 15, 3: 35, 4: 40 },
    agreeColor: '#9FD7C3',
    scaleSize: 4,
    height: 40,
  },
};
