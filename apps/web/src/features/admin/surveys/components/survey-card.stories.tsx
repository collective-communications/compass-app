import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { SurveyCard } from './survey-card';
import type { SurveyListItem } from '../services/admin-survey-service';

const baseSurvey: SurveyListItem = {
  id: 'survey-1',
  organizationId: 'org-1',
  title: 'Q1 2026 Culture Assessment',
  description: 'Annual culture assessment for the engineering division.',
  status: 'active',
  opensAt: '2026-03-01T00:00:00Z',
  closesAt: '2026-03-31T23:59:59Z',
  settings: null,
  scoresCalculated: false,
  scoresCalculatedAt: null,
  createdAt: '2026-02-15T00:00:00Z',
  updatedAt: '2026-03-01T00:00:00Z',
  createdBy: 'user-1',
  responseCount: 42,
  completionPercent: 65,
};

const meta = {
  title: 'Features/Admin/Surveys/SurveyCard',
  component: SurveyCard,
  args: {
    survey: baseSurvey,
    onClick: fn(),
    onConfigure: fn(),
    onEditQuestions: fn(),
    onCopyLink: fn(),
    onViewResults: fn(),
  },
} satisfies Meta<typeof SurveyCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Active survey with responses and completion progress. */
export const Active: Story = {};

/** Draft survey — no responses yet. */
export const Draft: Story = {
  args: {
    survey: {
      ...baseSurvey,
      status: 'draft',
      responseCount: 0,
      completionPercent: 0,
      closesAt: null,
    },
  },
};

/** Paused survey. */
export const Paused: Story = {
  args: {
    survey: { ...baseSurvey, status: 'paused' },
  },
};

/** Closed survey with full completion. */
export const Closed: Story = {
  args: {
    survey: {
      ...baseSurvey,
      status: 'closed',
      responseCount: 120,
      completionPercent: 100,
      closesAt: '2026-03-10T00:00:00Z',
    },
  },
};

/** Archived survey. */
export const Archived: Story = {
  args: {
    survey: {
      ...baseSurvey,
      status: 'archived',
      responseCount: 95,
      completionPercent: 87,
    },
  },
};

/** Long title and description — tests truncation. */
export const LongContent: Story = {
  args: {
    survey: {
      ...baseSurvey,
      title: 'Comprehensive Annual Organization-Wide Culture and Communication Assessment for All Divisions',
      description: 'This survey covers all four dimensions of the Culture Compass framework including Core Values, Clarity of Purpose, Connection and Belonging, and Collaboration and Teamwork. All full-time and part-time employees are encouraged to participate.',
    },
  },
};
