import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { EditOrgModal } from './edit-org-modal';
import type { OrganizationSummary } from '@compass/types';

const sampleOrg: OrganizationSummary = {
  id: 'org-001',
  name: 'Maple Leaf Industries',
  slug: 'maple-leaf-industries',
  industry: 'Manufacturing',
  employeeCount: 850,
  logoUrl: null,
  primaryContactName: 'Sarah Chen',
  primaryContactEmail: 'sarah@mapleleaf.ca',
  createdAt: '2025-06-15T00:00:00Z',
  totalSurveys: 3,
  activeSurveyId: null,
  activeSurveyTitle: null,
  responseCount: null,
  completionRate: null,
  daysRemaining: null,
  lastScore: 3.4,
  scoreTrend: 'up',
  assignedConsultant: 'Jordan Park',
};

const meta = {
  title: 'Features/Admin/Clients/EditOrgModal',
  component: EditOrgModal,
  args: {
    open: true,
    organization: sampleOrg,
    onClose: fn(),
  },
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof EditOrgModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const MinimalOrg: Story = {
  args: {
    organization: {
      ...sampleOrg,
      industry: null,
      employeeCount: null,
      primaryContactName: null,
      primaryContactEmail: null,
    },
  },
};

export const Closed: Story = {
  args: { open: false },
};
