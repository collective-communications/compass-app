import type { Meta, StoryObj } from '@storybook/react';
import { AnonymityWarning } from './anonymity-warning';

const meta = {
  title: 'Features/Results/Groups/AnonymityWarning',
  component: AnonymityWarning,
  args: {
    segmentValue: 'Marketing',
  },
} satisfies Meta<typeof AnonymityWarning>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LongSegmentName: Story = {
  args: { segmentValue: 'Operations & Supply Chain Management' },
};

export const ShortSegmentName: Story = {
  args: { segmentValue: 'IT' },
};
