import type { Meta, StoryObj } from '@storybook/react';
import { KeyMetricsCard } from './key-metrics-card';
import type { OrganizationSummary } from '@compass/types';

const baseOrg: OrganizationSummary = {
  id: 'org-001',
  name: 'Maple Leaf Industries',
  slug: 'maple-leaf-industries',
  industry: 'Manufacturing',
  employeeCount: 850,
  logoUrl: null,
  primaryContactName: null,
  primaryContactEmail: null,
  createdAt: '2025-06-15T00:00:00Z',
  totalSurveys: 5,
  activeSurveyId: 'survey-001',
  activeSurveyTitle: 'Q1 2026 Culture Assessment',
  responseCount: 142,
  completionRate: 72,
  daysRemaining: 12,
  lastScore: 3.4,
  scoreTrend: 'up',
  assignedConsultant: null,
};

const meta = {
  title: 'Features/Admin/Clients/KeyMetricsCard',
  component: KeyMetricsCard,
  args: {
    organization: baseOrg,
  },
} satisfies Meta<typeof KeyMetricsCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ScoreTrendDown: Story = {
  args: {
    organization: { ...baseOrg, lastScore: 2.1, scoreTrend: 'down' },
  },
};

export const ScoreStable: Story = {
  args: {
    organization: { ...baseOrg, scoreTrend: 'stable' },
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
    },
  },
};

export const NoActiveSurvey: Story = {
  args: {
    organization: {
      ...baseOrg,
      activeSurveyId: null,
      activeSurveyTitle: null,
    },
  },
};
