import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ReminderConfig } from './reminder-config';

const meta = {
  title: 'Features/Admin/Surveys/ReminderConfig',
  component: ReminderConfig,
  args: {
    value: [],
    onChange: fn(),
  },
} satisfies Meta<typeof ReminderConfig>;

export default meta;
type Story = StoryObj<typeof meta>;

/** No reminders selected. */
export const Default: Story = {};

/** All three reminder intervals enabled. */
export const AllSelected: Story = {
  args: {
    value: [3, 7, 14],
  },
};

/** Only the 7-day reminder enabled. */
export const SingleSelected: Story = {
  args: {
    value: [7],
  },
};
