import type { Meta, StoryObj } from '@storybook/react';
import { AppLink } from './app-link';

const meta = {
  title: 'Components/Navigation/AppLink',
  component: AppLink,
  args: {
    to: '/dashboard',
    children: 'Go to Dashboard',
  },
} satisfies Meta<typeof AppLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Styled: Story = {
  args: {
    to: '/results',
    children: 'View Results',
    className: 'text-sm font-medium text-[var(--color-core)] underline',
  },
};
