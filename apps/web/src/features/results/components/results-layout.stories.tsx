import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ResultsLayout } from './results-layout';

const meta = {
  title: 'Features/Results/ResultsLayout',
  component: ResultsLayout,
  args: {
    activeTab: 'compass',
    onTabChange: fn(),
    onBack: fn(),
    surveyTitle: 'Q1 2026 Culture Assessment',
    children: (
      <div className="rounded-lg border border-dashed border-[var(--grey-300)] p-8 text-center text-sm text-[var(--text-secondary)]">
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
        <p className="text-sm text-[var(--text-secondary)]">Core is your strongest dimension at 82%.</p>
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
