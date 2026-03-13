import type { Meta, StoryObj } from '@storybook/react-vite';
import { AutoSaveIndicator } from './auto-save-indicator';

const meta = {
  title: 'Features/Admin/Surveys/AutoSaveIndicator',
  component: AutoSaveIndicator,
} satisfies Meta<typeof AutoSaveIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

/** No text visible — nothing has changed yet. */
export const Idle: Story = {
  args: { status: 'idle' },
};

/** Mutation in flight. */
export const Saving: Story = {
  args: { status: 'saving' },
};

/** All mutations settled successfully. */
export const Saved: Story = {
  args: { status: 'saved' },
};

/** A mutation failed. */
export const Error: Story = {
  args: { status: 'error' },
};
