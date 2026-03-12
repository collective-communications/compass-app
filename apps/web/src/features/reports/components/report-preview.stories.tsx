import type { Meta, StoryObj } from '@storybook/react';
import { ReportPreview } from './report-preview';
import { AppShellDecorator } from '../../../../../../apps/storybook/.storybook/decorators/shells';
import type { ReportRow } from '../services/report-api';

const completedReport: ReportRow = {
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
  storagePath: 'reports/org-001/rpt-001.pdf',
};

/**
 * ReportPreview uses useReportDownload internally (Supabase dependency).
 * The download button will render but won't function without a backend.
 * Visual states are fully testable.
 */
const meta = {
  title: 'Features/Reports/ReportPreview',
  component: ReportPreview,
  decorators: [AppShellDecorator],
  args: {
    report: completedReport,
  },
} satisfies Meta<typeof ReportPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Completed report with all metadata and download button. */
export const Completed: Story = {};

/** No report selected — empty state. */
export const EmptyState: Story = {
  args: {
    report: null,
  },
};

/** Failed report with error detail. */
export const Failed: Story = {
  args: {
    report: {
      ...completedReport,
      status: 'failed',
      fileUrl: null,
      fileSize: null,
      pageCount: null,
      storagePath: null,
      error: 'PDF rendering engine returned a 500 error.',
    },
  },
};

/** In-progress report without file metadata. */
export const InProgress: Story = {
  args: {
    report: {
      ...completedReport,
      status: 'generating',
      progress: 55,
      fileUrl: null,
      fileSize: null,
      pageCount: null,
      storagePath: null,
    },
  },
};

/** Report with no sections listed. */
export const NoSections: Story = {
  args: {
    report: {
      ...completedReport,
      sections: [],
    },
  },
};
