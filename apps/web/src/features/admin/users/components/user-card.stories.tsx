import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { UserCard } from './user-card';
import type { TeamMember } from '../services/user-service';

const CCC_ROLES = [
  { value: 'ccc_admin', label: 'Admin' },
  { value: 'ccc_member', label: 'Member' },
] as const;

const CLIENT_ROLES = [
  { value: 'client_exec', label: 'Executive' },
  { value: 'client_director', label: 'Director' },
  { value: 'client_manager', label: 'Manager' },
] as const;

const baseMember: TeamMember = {
  id: 'user-002',
  email: 'jordan.park@collectivecommunication.ca',
  fullName: 'Jordan Park',
  avatarUrl: null,
  role: 'ccc_member',
  assignedClients: ['org-001', 'org-002', 'org-003'],
  lastActiveAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  createdAt: '2025-03-10T00:00:00Z',
};

const meta = {
  title: 'Features/Admin/Users/UserCard',
  component: UserCard,
  args: {
    member: baseMember,
    currentUserId: 'user-001',
    totalAdmins: 2,
    availableRoles: CCC_ROLES,
    onRoleChange: fn(),
    onRemove: fn(),
    roleChangeError: null,
    removeError: null,
    isUpdating: false,
  },
} satisfies Meta<typeof UserCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CurrentUser: Story = {
  args: {
    member: { ...baseMember, id: 'user-001', role: 'ccc_admin' },
    currentUserId: 'user-001',
  },
};

export const AdminRole: Story = {
  args: {
    member: { ...baseMember, role: 'ccc_admin' },
  },
};

export const LastAdmin: Story = {
  args: {
    member: { ...baseMember, role: 'ccc_admin' },
    totalAdmins: 1,
  },
};

export const WithAvatar: Story = {
  args: {
    member: {
      ...baseMember,
      avatarUrl: 'https://placehold.co/40x40/0A3B4F/white?text=JP',
    },
  },
};

export const ClientRole: Story = {
  args: {
    member: { ...baseMember, role: 'client_director' },
    availableRoles: CLIENT_ROLES,
  },
};

export const NoClients: Story = {
  args: {
    member: { ...baseMember, assignedClients: [] },
  },
};

export const NeverActive: Story = {
  args: {
    member: { ...baseMember, lastActiveAt: null },
  },
};

export const RoleChangeError: Story = {
  args: { roleChangeError: 'Failed to update role.' },
};

export const RemoveError: Story = {
  args: { removeError: 'Failed to remove member.' },
};

export const Updating: Story = {
  args: { isUpdating: true },
};
