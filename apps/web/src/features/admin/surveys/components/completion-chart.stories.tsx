import type { Meta, StoryObj } from '@storybook/react';
import { CompletionChart } from './completion-chart';

const meta = {
  title: 'Features/Admin/Surveys/CompletionChart',
  component: CompletionChart,
} satisfies Meta<typeof CompletionChart>;

export default meta;
type Story = StoryObj<typeof meta>;

/** No completions yet — shows empty state. */
export const Empty: Story = {
  args: {
    dailyCompletions: [],
  },
};

/** Typical week of completions with varying counts. */
export const WithData: Story = {
  args: {
    dailyCompletions: [
      { date: '2026-03-05', count: 3 },
      { date: '2026-03-06', count: 12 },
      { date: '2026-03-07', count: 8 },
      { date: '2026-03-08', count: 1 },
      { date: '2026-03-09', count: 15 },
      { date: '2026-03-10', count: 22 },
      { date: '2026-03-11', count: 6 },
    ],
  },
};

/** Single day of responses. */
export const SingleDay: Story = {
  args: {
    dailyCompletions: [{ date: '2026-03-11', count: 7 }],
  },
};
