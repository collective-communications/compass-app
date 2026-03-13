import type { Meta, StoryObj } from '@storybook/react-vite';
import { SurveyNotOpenScreen } from './survey-not-open-screen';
import { SurveyShellDecorator } from '../../../../../../../apps/storybook/.storybook/decorators/shells';

const meta = {
  title: 'Features/Survey/EdgeStates/SurveyNotOpenScreen',
  component: SurveyNotOpenScreen,
  decorators: [SurveyShellDecorator],
} satisfies Meta<typeof SurveyNotOpenScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default — no open date provided. */
export const Default: Story = {
  args: {},
};

/** With a specific open date displayed. */
export const WithOpenDate: Story = {
  args: {
    opensDate: '2026-04-01T00:00:00Z',
  },
};
