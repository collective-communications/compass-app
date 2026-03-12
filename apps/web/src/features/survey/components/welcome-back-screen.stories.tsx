import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { WelcomeBackScreen } from './welcome-back-screen';
import { SurveyShellDecorator } from '../../../../../../apps/storybook/.storybook/decorators/shells';

const meta = {
  title: 'Features/Survey/WelcomeBackScreen',
  component: WelcomeBackScreen,
  decorators: [SurveyShellDecorator],
  args: {
    onResume: fn(),
    isLoading: false,
  },
} satisfies Meta<typeof WelcomeBackScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Just started — early progress. */
export const EarlyProgress: Story = {
  args: {
    answeredCount: 3,
    totalCount: 24,
    resumeIndex: 4,
  },
};

/** Halfway through the survey. */
export const Halfway: Story = {
  args: {
    answeredCount: 12,
    totalCount: 24,
    resumeIndex: 13,
  },
};

/** Nearly complete — only a few left. */
export const NearlyComplete: Story = {
  args: {
    answeredCount: 22,
    totalCount: 24,
    resumeIndex: 23,
  },
};

/** Loading state while restoring session. */
export const Loading: Story = {
  args: {
    answeredCount: 12,
    totalCount: 24,
    resumeIndex: 13,
    isLoading: true,
  },
};
