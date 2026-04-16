import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { AppHeader } from './app-header';
import type { AuthUser } from '@compass/types';
import { getNavConfigForRole } from '../../lib/navigation';

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
    config: getNavConfigForRole(clientUser.role),
    activeTabId: 'dashboard',
    onSignOut: fn(),
    onNavigate: fn(),
  },
} satisfies Meta<typeof AppHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Client (tier 2) — shows Dashboard / Results / Reports tab bar; clickable logo → /dashboard. */
export const ClientTier: Story = {};

/** Admin (tier 1) — no tab bar; clickable logo → /clients. */
export const AdminTier: Story = {
  args: {
    user: adminUser,
    config: getNavConfigForRole(adminUser.role),
    activeTabId: null,
  },
};

/** Client tier with no active tab — e.g. sub-route not matching any tab. */
export const NoActiveTab: Story = {
  args: { activeTabId: null },
};
