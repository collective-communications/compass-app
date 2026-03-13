import type { Meta, StoryObj } from '@storybook/react-vite';
import { RecalculateButton } from './recalculate-button';

const meta = {
  title: 'Features/Admin/Surveys/RecalculateButton',
  component: RecalculateButton,
  args: {
    surveyId: 'survey-1',
    scoresCalculated: false,
    scoresCalculatedAt: null,
  },
} satisfies Meta<typeof RecalculateButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** No previous calculation — button only. */
export const Default: Story = {};

/** Scores previously calculated — shows timestamp. */
export const PreviouslyCalculated: Story = {
  args: {
    scoresCalculated: true,
    scoresCalculatedAt: '2026-03-10T14:30:00Z',
  },
};
