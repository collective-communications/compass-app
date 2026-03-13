import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ReportCard } from './report-card';
import { AppShellDecorator } from '../../../../../../apps/storybook/.storybook/decorators/shells';
import type { ReportStatus } from '@compass/types';

const completedReport: ReportStatus = {
  id: 'rpt-001',
  surveyId: 'survey-001',
  format: 'pdf',
  status: 'completed',
  progress: 100,
  fileUrl: 'https://storage.example.com/reports/rpt-001.pdf',
  fileSize: 2_457_600,
  pageCount: 18,
  sections: ['cover', 'executive_summary', 'compass_overview', 'dimension_deep_dives', 'recommendations'],
  createdAt: '2026-03-10T14:30:00Z',
  createdBy: 'user-001',
  error: null,
};

const meta = {
  title: 'Features/Reports/ReportCard',
  component: ReportCard,
  decorators: [AppShellDecorator],
  args: {
    report: completedReport,
    isSelected: false,
    onSelect: fn(),
  },
} satisfies Meta<typeof ReportCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Completed report with download available. */
export const Completed: Story = {};

/** Selected state with ring indicator. */
export const Selected: Story = {
  args: {
    isSelected: true,
  },
};

/** Report currently being generated. */
export const Generating: Story = {
  args: {
    report: {
      ...completedReport,
      status: 'generating',
      progress: 45,
      fileUrl: null,
      fileSize: null,
      pageCount: null,
    },
  },
};

/** Queued report awaiting generation. */
export const Queued: Story = {
  args: {
    report: {
      ...completedReport,
      status: 'queued',
      progress: 0,
      fileUrl: null,
      fileSize: null,
      pageCount: null,
    },
  },
};

/** Failed report with error message. */
export const Failed: Story = {
  args: {
    report: {
      ...completedReport,
      status: 'failed',
      progress: 62,
      fileUrl: null,
      fileSize: null,
      pageCount: null,
      error: 'Timeout: report generation exceeded 60s limit.',
    },
  },
};
