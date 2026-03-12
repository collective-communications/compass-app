import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { QuickActions } from './quick-actions';
import { AppShellDecorator } from '../../../../../../apps/storybook/.storybook/decorators/shells';

const meta = {
  title: 'Features/Dashboard/QuickActions',
  component: QuickActions,
  decorators: [AppShellDecorator],
  args: {
    deploymentUrl: 'https://survey.collectivecommunication.ca/s/abc123',
    surveyId: 'survey-001',
    resultsEnabled: true,
    onNavigate: fn(),
  },
} satisfies Meta<typeof QuickActions>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Both copy link and view results actions available. */
export const Default: Story = {};

/** Results not yet enabled — only copy link shown. */
export const ResultsDisabled: Story = {
  args: {
    resultsEnabled: false,
  },
};

/** No deployment URL — copy link button disabled. */
export const NoDeploymentUrl: Story = {
  args: {
    deploymentUrl: null,
  },
};
