import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { SurveyPicker, type ReportSurveyOption } from './survey-picker';
import { AppShellDecorator } from '../../../../../../apps/storybook/.storybook/decorators/shells';

const sampleSurveys: ReportSurveyOption[] = [
  { id: 'survey-001', title: 'Q1 2026 Culture Assessment', status: 'active' },
  { id: 'survey-002', title: 'Q4 2025 Culture Assessment', status: 'completed' },
  { id: 'survey-003', title: 'Annual 2024 Full Survey', status: 'closed' },
];

const meta = {
  title: 'Features/Reports/SurveyPicker',
  component: SurveyPicker,
  decorators: [AppShellDecorator],
  args: {
    surveys: sampleSurveys,
    activeSurveyId: 'survey-001',
    onSelect: fn(),
    isLoading: false,
  },
} satisfies Meta<typeof SurveyPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default with multiple surveys, first selected. */
export const Default: Story = {};

/** Loading skeleton state. */
export const Loading: Story = {
  args: {
    isLoading: true,
  },
};

/** Empty state — no surveys available. */
export const Empty: Story = {
  args: {
    surveys: [],
    activeSurveyId: null,
  },
};

/** No survey currently selected. */
export const NoneSelected: Story = {
  args: {
    activeSurveyId: null,
  },
};
