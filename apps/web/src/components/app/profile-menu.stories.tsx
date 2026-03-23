import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ProfileMenu } from './profile-menu';
import type { AuthUser } from '@compass/types';

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
    tier: 'tier_2',
    onSignOut: fn(),
    onNavigate: fn(),
  },
} satisfies Meta<typeof ProfileMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Admin tier — shows Help and Settings items in dropdown */
export const AdminTier: Story = {
  args: {
    user: adminUser,
    tier: 'tier_1',
  },
};

export const EmailOnly: Story = {
  args: {
    user: {
      ...clientUser,
      fullName: null,
    },
    tier: 'tier_2',
  },
};
