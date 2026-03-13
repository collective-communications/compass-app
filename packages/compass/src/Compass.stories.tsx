import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { Compass } from './Compass';
import type { DimensionScore } from './types';

const allScores: DimensionScore[] = [
  { dimension: 'core', score: 72, color: '#0A3B4F', label: 'Core' },
  { dimension: 'clarity', score: 65, color: '#FF7F50', label: 'Clarity' },
  { dimension: 'connection', score: 81, color: '#9FD7C3', label: 'Connection' },
  { dimension: 'collaboration', score: 54, color: '#E8B4A8', label: 'Collaboration' },
];

const highScores: DimensionScore[] = [
  { dimension: 'core', score: 95, color: '#0A3B4F', label: 'Core' },
  { dimension: 'clarity', score: 92, color: '#FF7F50', label: 'Clarity' },
  { dimension: 'connection', score: 97, color: '#9FD7C3', label: 'Connection' },
  { dimension: 'collaboration', score: 90, color: '#E8B4A8', label: 'Collaboration' },
];

const lowScores: DimensionScore[] = [
  { dimension: 'core', score: 18, color: '#0A3B4F', label: 'Core' },
  { dimension: 'clarity', score: 22, color: '#FF7F50', label: 'Clarity' },
  { dimension: 'connection', score: 15, color: '#9FD7C3', label: 'Connection' },
  { dimension: 'collaboration', score: 25, color: '#E8B4A8', label: 'Collaboration' },
];

const mixedScores: DimensionScore[] = [
  { dimension: 'core', score: 45, color: '#0A3B4F', label: 'Core' },
  { dimension: 'clarity', score: 88, color: '#FF7F50', label: 'Clarity' },
  { dimension: 'connection', score: 30, color: '#9FD7C3', label: 'Connection' },
  { dimension: 'collaboration', score: 72, color: '#E8B4A8', label: 'Collaboration' },
];

const meta = {
  title: 'Packages/Compass/Compass',
  component: Compass,
  args: {
    scores: allScores,
    onSegmentClick: fn(),
    onSegmentHover: fn(),
  },
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Compass>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const HighScores: Story = {
  args: { scores: highScores },
};

export const LowScores: Story = {
  args: { scores: lowScores },
};

export const MixedScores: Story = {
  args: { scores: mixedScores },
};

export const SelectedSegment: Story = {
  args: { selectedSegment: 'clarity' },
};

export const Animated: Story = {
  args: { animated: true },
};

export const NoLabels: Story = {
  args: { showLabels: false },
};

export const NoGapIndicator: Story = {
  args: { showGapIndicator: false },
};

export const SmallSize: Story = {
  args: { size: 200 },
};

export const LargeSize: Story = {
  args: { size: 500 },
};
