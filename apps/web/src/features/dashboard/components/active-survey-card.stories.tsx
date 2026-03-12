import type { Meta, StoryObj } from '@storybook/react';
import { ActiveSurveyCard } from './active-survey-card';
import { AppShellDecorator } from '../../../../../../apps/storybook/.storybook/decorators/shells';
import type { ActiveSurvey } from '../hooks/use-dashboard-data';

const baseSurvey: ActiveSurvey = {
  survey: {
    id: 'survey-001',
    organizationId: 'org-001',
    title: 'Q1 2026 Culture Assessment',
    description: 'Annual culture survey for all departments',
    status: 'active',
    opensAt: '2026-01-15T00:00:00Z',
    closesAt: '2026-04-15T00:00:00Z',
    settings: null,
    scoresCalculated: false,
    scoresCalculatedAt: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
    createdBy: 'user-001',
  },
  deployment: null,
  responseCount: 87,
  expectedCount: 150,
  completionPercent: 58,
  daysRemaining: 34,
};

const meta = {
  title: 'Features/Dashboard/ActiveSurveyCard',
  component: ActiveSurveyCard,
  decorators: [AppShellDecorator],
  args: {
    data: baseSurvey,
  },
} satisfies Meta<typeof ActiveSurveyCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Survey in progress with typical response rate. */
export const Default: Story = {};

/** Nearly complete survey with high response rate. */
export const NearlyComplete: Story = {
  args: {
    data: {
      ...baseSurvey,
      responseCount: 142,
      completionPercent: 95,
      daysRemaining: 3,
    },
  },
};

/** Just launched — no responses yet. */
export const JustLaunched: Story = {
  args: {
    data: {
      ...baseSurvey,
      responseCount: 0,
      completionPercent: 0,
      daysRemaining: 90,
    },
  },
};

/** Close date unknown (null daysRemaining). */
export const NoDaysRemaining: Story = {
  args: {
    data: {
      ...baseSurvey,
      daysRemaining: null,
      survey: { ...baseSurvey.survey, closesAt: null },
    },
  },
};
