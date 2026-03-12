import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { SurveyPeriodSelector } from './survey-period-selector';

const meta = {
  title: 'Features/Results/SurveyPeriodSelector',
  component: SurveyPeriodSelector,
  args: {
    onSelect: fn(),
  },
} satisfies Meta<typeof SurveyPeriodSelector>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    surveys: [
      { id: 'survey-1', title: 'Q1 2026 Culture Assessment', closesAt: '2026-03-31T00:00:00Z' },
      { id: 'survey-2', title: 'Q4 2025 Culture Assessment', closesAt: '2025-12-31T00:00:00Z' },
      { id: 'survey-3', title: 'Q3 2025 Culture Assessment', closesAt: '2025-09-30T00:00:00Z' },
    ],
    selectedId: 'survey-1',
  },
};

export const SingleSurvey: Story = {
  args: {
    surveys: [
      { id: 'survey-1', title: 'Annual Culture Assessment 2026', closesAt: '2026-06-30T00:00:00Z' },
    ],
    selectedId: 'survey-1',
  },
};
