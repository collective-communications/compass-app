import type { Meta, StoryObj } from '@storybook/react';
import { AlreadyCompletedScreen } from './already-completed-screen';
import { SurveyShellDecorator } from '../../../../../../../apps/storybook/.storybook/decorators/shells';

const meta = {
  title: 'Features/Survey/EdgeStates/AlreadyCompletedScreen',
  component: AlreadyCompletedScreen,
  decorators: [SurveyShellDecorator],
} satisfies Meta<typeof AlreadyCompletedScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default — survey already completed on this device. */
export const Default: Story = {};
