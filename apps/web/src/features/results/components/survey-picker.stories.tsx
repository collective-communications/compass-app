import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { SurveyPicker } from './survey-picker';

const meta = {
  title: 'Features/Results/SurveyPicker',
  component: SurveyPicker,
  args: {
    onSelect: fn(),
  },
} satisfies Meta<typeof SurveyPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    surveys: [
      { id: 's1', title: 'Q1 2026 Culture Assessment', closedAt: '2026-03-31T00:00:00Z', scoresCalculatedAt: '2026-04-02T00:00:00Z', responseCount: 142 },
      { id: 's2', title: 'Q4 2025 Culture Assessment', closedAt: '2025-12-31T00:00:00Z', scoresCalculatedAt: '2025-01-03T00:00:00Z', responseCount: 128 },
    ],
    activeSurveyId: 's1',
  },
};

export const Loading: Story = {
  args: {
    surveys: [],
    activeSurveyId: '',
    isLoading: true,
  },
};

export const SingleSurvey: Story = {
  args: {
    surveys: [
      { id: 's1', title: 'Annual Assessment 2026', closedAt: '2026-06-30T00:00:00Z', scoresCalculatedAt: '2026-07-01T00:00:00Z', responseCount: 256 },
    ],
    activeSurveyId: 's1',
  },
};
