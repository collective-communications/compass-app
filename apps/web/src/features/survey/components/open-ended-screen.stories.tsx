import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { OpenEndedScreen } from './open-ended-screen';
import { SurveyShellDecorator } from '../../../../../../apps/storybook/.storybook/decorators/shells';

const meta = {
  title: 'Features/Survey/OpenEndedScreen',
  component: OpenEndedScreen,
  decorators: [SurveyShellDecorator],
  args: {
    prompt: 'Is there anything else you would like to share about your experience?',
    isSubmitting: false,
    onSubmit: fn(),
    onSkip: fn(),
  },
} satisfies Meta<typeof OpenEndedScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default state with empty textarea. */
export const Default: Story = {};

/** Submitting state with buttons disabled and label change. */
export const Submitting: Story = {
  args: {
    isSubmitting: true,
  },
};

/** Custom prompt text. */
export const CustomPrompt: Story = {
  args: {
    prompt: 'What is one thing your organization could do to improve its culture?',
  },
};
