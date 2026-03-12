import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { ExportModal } from './export-modal';

/**
 * ExportModal uses internal hooks (useReportGeneration) that depend on Supabase.
 * Stories render the configure state (initial open state) which works without
 * a backend connection. The generating and complete states are hook-driven and
 * are best tested via interaction/integration tests.
 */
const meta = {
  title: 'Features/Reports/ExportModal',
  component: ExportModal,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    isOpen: true,
    onClose: fn(),
    surveyId: 'survey-001',
    surveyName: 'Q1 2026 Culture Assessment',
    onGenerated: fn(),
  },
} satisfies Meta<typeof ExportModal>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Configuration state — format and section selection. */
export const Default: Story = {};

/** Without a survey name in the header. */
export const NoSurveyName: Story = {
  args: {
    surveyName: undefined,
  },
};

/** Modal closed (not visible). */
export const Closed: Story = {
  args: {
    isOpen: false,
  },
};
