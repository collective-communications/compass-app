import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ProfileMenu } from './profile-menu';
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
  title: 'Components/App/ProfileMenu',
  component: ProfileMenu,
  args: {
    user: clientUser,
    items: getNavConfigForRole(clientUser.role).profileMenuItems,
    onSignOut: fn(),
    onNavigate: fn(),
  },
} satisfies Meta<typeof ProfileMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Client tier. Profile menu items are identical to the admin tier by design
 * — parity is the point of the refactor.
 */
export const ClientTier: Story = {};

/**
 * Admin tier. Same item list as client — the menu no longer branches on
 * role.
 */
export const AdminTier: Story = {
  args: {
    user: adminUser,
    items: getNavConfigForRole(adminUser.role).profileMenuItems,
  },
};

export const EmailOnly: Story = {
  args: {
    user: {
      ...clientUser,
      fullName: null,
    },
  },
};
