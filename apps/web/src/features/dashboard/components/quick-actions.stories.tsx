import type { Meta, StoryObj } from '@storybook/react-vite';
import { QuickActions } from './quick-actions';
import { AppShellDecorator } from '../../../../../../apps/storybook/.storybook/decorators/shells';

const meta = {
  title: 'Features/Dashboard/QuickActions',
  component: QuickActions,
  decorators: [AppShellDecorator],
  args: {
    deploymentUrl: 'https://app.collectiveculturecompass.com/s/abc123',
  },
} satisfies Meta<typeof QuickActions>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Copy link action available. */
export const Default: Story = {};

/** No deployment URL — copy link button disabled. */
export const NoDeploymentUrl: Story = {
  args: {
    deploymentUrl: null,
  },
};
