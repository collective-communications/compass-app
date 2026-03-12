import type { Meta, StoryObj } from '@storybook/react';
import { InvalidTokenScreen } from './invalid-token-screen';
import { SurveyShellDecorator } from '../../../../../../../apps/storybook/.storybook/decorators/shells';

const meta = {
  title: 'Features/Survey/EdgeStates/InvalidTokenScreen',
  component: InvalidTokenScreen,
  decorators: [SurveyShellDecorator],
} satisfies Meta<typeof InvalidTokenScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default — invalid or unrecognized survey token. */
export const Default: Story = {};
