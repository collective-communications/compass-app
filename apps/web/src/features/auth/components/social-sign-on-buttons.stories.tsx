import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { SocialSignOnButtons } from './social-sign-on-buttons';
import { PublicShellDecorator } from '../../../../../../apps/storybook/.storybook/decorators/shells';

const meta = {
  title: 'Features/Auth/SocialSignOnButtons',
  component: SocialSignOnButtons,
  decorators: [PublicShellDecorator],
  args: {
    onSignIn: fn(),
    isLoading: false,
  },
} satisfies Meta<typeof SocialSignOnButtons>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default state with both Google and Microsoft buttons enabled. */
export const Default: Story = {};

/** Loading state — both buttons disabled. */
export const Loading: Story = {
  args: {
    isLoading: true,
  },
};
