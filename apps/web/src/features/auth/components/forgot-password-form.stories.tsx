import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { ForgotPasswordForm } from './forgot-password-form';
import { PublicShellDecorator } from '../../../../../../apps/storybook/.storybook/decorators/shells';

const meta = {
  title: 'Features/Auth/ForgotPasswordForm',
  component: ForgotPasswordForm,
  decorators: [PublicShellDecorator],
  args: {
    onSubmit: fn(),
    isLoading: false,
    error: null,
  },
} satisfies Meta<typeof ForgotPasswordForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default idle state with empty email field. */
export const Default: Story = {};

/** Loading state while the reset link is being sent. */
export const Loading: Story = {
  args: {
    isLoading: true,
  },
};

/** Server error displayed below the submit button. */
export const WithError: Story = {
  args: {
    error: 'Unable to send reset link. Please try again later.',
  },
};
