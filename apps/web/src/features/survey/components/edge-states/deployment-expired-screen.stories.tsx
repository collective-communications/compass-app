import type { Meta, StoryObj } from '@storybook/react-vite';
import { DeploymentExpiredScreen } from './deployment-expired-screen';
import { SurveyShellDecorator } from '../../../../../../../apps/storybook/.storybook/decorators/shells';

const meta = {
  title: 'Features/Survey/EdgeStates/DeploymentExpiredScreen',
  component: DeploymentExpiredScreen,
  decorators: [SurveyShellDecorator],
} satisfies Meta<typeof DeploymentExpiredScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default — deployment link expired. */
export const Default: Story = {};
