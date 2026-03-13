import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { PreviousSurveys } from './previous-surveys';
import { AppShellDecorator } from '../../../../../../apps/storybook/.storybook/decorators/shells';
import type { PreviousSurvey } from '../hooks/use-dashboard-data';

function makeSurvey(id: string, title: string, responseCount: number, closedAt: string | null): PreviousSurvey {
  return {
    survey: {
      id,
      organizationId: 'org-001',
      title,
      description: null,
      status: 'completed',
      opensAt: '2025-01-01T00:00:00Z',
      closesAt: closedAt,
      settings: null,
      scoresCalculated: true,
      scoresCalculatedAt: closedAt,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: closedAt ?? '2025-06-01T00:00:00Z',
      createdBy: 'user-001',
    },
    responseCount,
    closedAt,
  };
}

const sampleSurveys: PreviousSurvey[] = [
  makeSurvey('s-001', 'Q4 2025 Culture Assessment', 134, '2025-12-15T00:00:00Z'),
  makeSurvey('s-002', 'Q2 2025 Pulse Check', 98, '2025-06-30T00:00:00Z'),
  makeSurvey('s-003', 'Annual 2024 Full Survey', 201, '2024-12-01T00:00:00Z'),
];

const meta = {
  title: 'Features/Dashboard/PreviousSurveys',
  component: PreviousSurveys,
  decorators: [AppShellDecorator],
  args: {
    surveys: sampleSurveys,
    onSelectSurvey: fn(),
  },
} satisfies Meta<typeof PreviousSurveys>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Multiple completed surveys. */
export const Default: Story = {};

/** Single completed survey. */
export const SingleSurvey: Story = {
  args: {
    surveys: [sampleSurveys[0]!],
  },
};
