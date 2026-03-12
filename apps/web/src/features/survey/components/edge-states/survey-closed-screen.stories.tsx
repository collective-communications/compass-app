import type { Meta, StoryObj } from '@storybook/react';
import { SurveyClosedScreen } from './survey-closed-screen';
import { SurveyShellDecorator } from '../../../../../../../apps/storybook/.storybook/decorators/shells';

const meta = {
  title: 'Features/Survey/EdgeStates/SurveyClosedScreen',
  component: SurveyClosedScreen,
  decorators: [SurveyShellDecorator],
} satisfies Meta<typeof SurveyClosedScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default — no close date provided. */
export const Default: Story = {
  args: {},
};

/** With a specific close date displayed. */
export const WithCloseDate: Story = {
  args: {
    closedDate: '2026-03-01T00:00:00Z',
  },
};
