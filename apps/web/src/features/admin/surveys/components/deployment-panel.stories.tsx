import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import type { Deployment, Survey } from '@compass/types';
import { DeploymentPanel } from './deployment-panel';

const baseSurvey: Survey = {
  id: 'survey-1',
  organizationId: 'org-1',
  title: 'Q1 Culture Assessment',
  description: 'Annual culture assessment for engineering',
  status: 'active',
  opensAt: '2026-03-01T00:00:00Z',
  closesAt: '2026-03-31T23:59:59Z',
  settings: null,
  scoresCalculated: false,
  scoresCalculatedAt: null,
  createdAt: '2026-02-15T00:00:00Z',
  updatedAt: '2026-03-01T00:00:00Z',
  createdBy: 'user-1',
};

const baseDeployment: Deployment = {
  id: 'deploy-1',
  surveyId: 'survey-1',
  type: 'anonymous_link',
  token: 'abc123def456',
  settings: null,
  expiresAt: null,
  accessCount: 42,
  lastAccessedAt: '2026-03-11T09:30:00Z',
  createdAt: '2026-03-01T00:00:00Z',
};

const meta = {
  title: 'Features/Admin/Surveys/DeploymentPanel',
  component: DeploymentPanel,
  args: {
    deployment: baseDeployment,
    survey: baseSurvey,
    onDeactivate: fn(),
    isPending: false,
  },
} satisfies Meta<typeof DeploymentPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Active deployment with 20 days remaining. */
export const Default: Story = {};

/** Only a few days left — shows warning badge. */
export const ExpiringsSoon: Story = {
  args: {
    survey: {
      ...baseSurvey,
      closesAt: new Date(Date.now() + 2 * 86_400_000).toISOString(),
    },
  },
};

/** Survey already expired. */
export const Expired: Story = {
  args: {
    survey: {
      ...baseSurvey,
      closesAt: '2026-03-10T00:00:00Z',
    },
  },
};

/** Deactivation in progress. */
export const Deactivating: Story = {
  args: {
    isPending: true,
  },
};

/** Email invite deployment type — shows invitation section. */
export const EmailInvite: Story = {
  args: {
    deployment: {
      ...baseDeployment,
      type: 'email_invite',
    },
  },
};
