import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { SaveProgressScreen } from './save-progress-screen';
import { SurveyShellDecorator } from '../../../../../../apps/storybook/.storybook/decorators/shells';

const meta = {
  title: 'Features/Survey/SaveProgressScreen',
  component: SaveProgressScreen,
  decorators: [SurveyShellDecorator],
  args: {
    onContinue: fn(),
    deploymentToken: 'abc123-demo-token',
  },
} satisfies Meta<typeof SaveProgressScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default — many questions remaining with a close date. */
export const Default: Story = {
  args: {
    remainingCount: 18,
    estimatedMinutes: 6,
    closesAt: '2026-04-15T23:59:59Z',
    daysRemaining: 34,
  },
};

/** Almost done — only a few questions left. */
export const AlmostDone: Story = {
  args: {
    remainingCount: 3,
    estimatedMinutes: 1,
    closesAt: '2026-04-15T23:59:59Z',
    daysRemaining: 34,
  },
};

/** Closing soon — urgency indicator. */
export const ClosingSoon: Story = {
  args: {
    remainingCount: 12,
    estimatedMinutes: 4,
    closesAt: '2026-03-14T23:59:59Z',
    daysRemaining: 2,
  },
};

/** No close date — open-ended survey. */
export const NoCloseDate: Story = {
  args: {
    remainingCount: 10,
    estimatedMinutes: 4,
    closesAt: null,
    daysRemaining: null,
  },
};

/** Single question remaining. */
export const OneRemaining: Story = {
  args: {
    remainingCount: 1,
    estimatedMinutes: 1,
    closesAt: '2026-04-15T23:59:59Z',
    daysRemaining: 34,
  },
};
