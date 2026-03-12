import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { ClientCard } from './client-card';
import type { OrganizationSummary } from '@compass/types';

const baseOrg: OrganizationSummary = {
  id: 'org-001',
  name: 'Maple Leaf Industries',
  slug: 'maple-leaf-industries',
  industry: 'Manufacturing',
  employeeCount: 850,
  logoUrl: null,
  primaryContactName: 'Sarah Chen',
  primaryContactEmail: 'sarah@mapleleaf.ca',
  createdAt: '2025-06-15T00:00:00Z',
  totalSurveys: 3,
  activeSurveyId: 'survey-001',
  activeSurveyTitle: 'Q1 2026 Culture Assessment',
  responseCount: 142,
  completionRate: 72,
  daysRemaining: 12,
  lastScore: 3.4,
  scoreTrend: 'up',
  assignedConsultant: 'Jordan Park',
};

const meta = {
  title: 'Features/Admin/Clients/ClientCard',
  component: ClientCard,
  args: {
    organization: baseOrg,
    onClick: fn(),
  },
} satisfies Meta<typeof ClientCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NoActiveSurvey: Story = {
  args: {
    organization: {
      ...baseOrg,
      activeSurveyId: null,
      activeSurveyTitle: null,
      completionRate: null,
      daysRemaining: null,
    },
  },
};

export const LowCompletion: Story = {
  args: {
    organization: {
      ...baseOrg,
      completionRate: 18,
      daysRemaining: 5,
    },
  },
};

export const ClosingSoon: Story = {
  args: {
    organization: {
      ...baseOrg,
      daysRemaining: 2,
    },
  },
};

export const ScoreTrendDown: Story = {
  args: {
    organization: {
      ...baseOrg,
      lastScore: 2.1,
      scoreTrend: 'down',
    },
  },
};

export const NoScore: Story = {
  args: {
    organization: {
      ...baseOrg,
      totalSurveys: 0,
      lastScore: null,
      scoreTrend: null,
      activeSurveyId: null,
      activeSurveyTitle: null,
      completionRate: null,
      daysRemaining: null,
      assignedConsultant: null,
    },
  },
};
