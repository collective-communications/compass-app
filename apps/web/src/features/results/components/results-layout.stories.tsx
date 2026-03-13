import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ResultsLayout } from './results-layout';
import type { ScoredSurvey } from '../types';

const mockSurveys: ScoredSurvey[] = [
  { id: 's1', title: 'Q1 2026 Culture Assessment', closedAt: '2026-03-31T00:00:00Z', scoresCalculatedAt: '2026-04-02T00:00:00Z', responseCount: 142 },
  { id: 's2', title: 'Q4 2025 Culture Assessment', closedAt: '2025-12-31T00:00:00Z', scoresCalculatedAt: '2025-01-03T00:00:00Z', responseCount: 128 },
];

const meta = {
  title: 'Features/Results/ResultsLayout',
  component: ResultsLayout,
  args: {
    activeTab: 'compass',
    onTabChange: fn(),
    surveys: mockSurveys,
    activeSurveyId: 's1',
    onSurveyChange: fn(),
    children: (
      <div className="rounded-lg border border-dashed border-[var(--grey-300)] p-8 text-center text-sm text-[var(--grey-500)]">
        Tab content area
      </div>
    ),
  },
} satisfies Meta<typeof ResultsLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithInsightsPanel: Story = {
  args: {
    insightsContent: (
      <div className="flex flex-col gap-4 p-4">
        <h3 className="text-sm font-semibold">Key Findings</h3>
        <p className="text-sm text-[var(--grey-500)]">Core is your strongest dimension at 82%.</p>
      </div>
    ),
  },
};

export const SurveyTab: Story = {
  args: {
    activeTab: 'survey',
  },
};

export const ContentLoading: Story = {
  args: {
    isContentLoading: true,
  },
};

export const SurveysLoading: Story = {
  args: {
    isSurveysLoading: true,
  },
};
