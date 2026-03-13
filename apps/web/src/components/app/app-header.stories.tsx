import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { AppHeader } from './app-header';
import type { AuthUser } from '@compass/types';
import type { TabConfig } from '../../lib/navigation';

const clientTabs: TabConfig[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'layout-grid', href: '/dashboard' },
  { id: 'results', label: 'Results', icon: 'compass', href: '/results' },
  { id: 'reports', label: 'Reports', icon: 'file-down', href: '/reports' },
];

const adminTabs: TabConfig[] = [
  { id: 'clients', label: 'Clients', icon: 'building', href: '/admin/clients' },
  { id: 'settings', label: 'Settings', icon: 'settings', href: '/admin/settings' },
];

const clientUser: AuthUser = {
  id: 'user-1',
  email: 'jane.doe@acme.com',
  fullName: 'Jane Doe',
  avatarUrl: null,
  role: 'client_exec',
  organizationId: 'org-1',
  tier: 'tier_2',
};

const adminUser: AuthUser = {
  id: 'user-2',
  email: 'admin@collectivecommunication.ca',
  fullName: 'Sarah Chen',
  avatarUrl: null,
  role: 'ccc_admin',
  organizationId: null,
  tier: 'tier_1',
};

const meta = {
  title: 'Components/App/AppHeader',
  component: AppHeader,
  parameters: { layout: 'fullscreen' },
  args: {
    user: clientUser,
    tabs: clientTabs,
    activeTabId: 'dashboard',
    onSignOut: fn(),
  },
} satisfies Meta<typeof AppHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AdminView: Story = {
  args: {
    user: adminUser,
    tabs: adminTabs,
    activeTabId: 'clients',
  },
};

export const NoActiveTab: Story = {
  args: { activeTabId: null },
};
