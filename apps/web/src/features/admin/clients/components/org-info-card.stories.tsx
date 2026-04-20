import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { OrgInfoCard } from './org-info-card';
import type { OrganizationSummary } from '@compass/types';

const baseOrg: OrganizationSummary = {
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
  lastScore: null,
  scoreTrend: null,
  assignedConsultant: null,
};

const meta = {
  title: 'Features/Admin/Clients/OrgInfoCard',
  component: OrgInfoCard,
  args: {
    organization: baseOrg,
    onEdit: fn(),
  },
} satisfies Meta<typeof OrgInfoCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithLogo: Story = {
  args: {
    organization: {
      ...baseOrg,
      logoUrl: 'https://placehold.co/64x64/0C3D50/white?text=ML',
    },
  },
};

export const MinimalInfo: Story = {
  args: {
    organization: {
      ...baseOrg,
      industry: null,
      employeeCount: null,
      primaryContactName: null,
      primaryContactEmail: null,
    },
  },
};

export const ContactEmailOnly: Story = {
  args: {
    organization: {
      ...baseOrg,
      primaryContactName: null,
    },
  },
};
