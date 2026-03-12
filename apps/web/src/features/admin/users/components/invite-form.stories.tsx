import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { InviteForm } from './invite-form';

const CCC_ROLES = [
  { value: 'ccc_admin', label: 'Admin' },
  { value: 'ccc_member', label: 'Member' },
] as const;

const CLIENT_ROLES = [
  { value: 'client_exec', label: 'Executive' },
  { value: 'client_director', label: 'Director' },
  { value: 'client_manager', label: 'Manager' },
] as const;

const meta = {
  title: 'Features/Admin/Users/InviteForm',
  component: InviteForm,
  args: {
    availableRoles: CCC_ROLES,
    defaultRole: 'ccc_member',
    existingEmails: ['admin@collectivecommunication.ca', 'jordan@collectivecommunication.ca'],
    pendingEmails: ['new-hire@collectivecommunication.ca'],
    onInvite: fn(),
    isPending: false,
    error: null,
    lastCreated: null,
  },
} satisfies Meta<typeof InviteForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ClientRoles: Story = {
  args: {
    availableRoles: CLIENT_ROLES,
    defaultRole: 'client_manager',
  },
};

export const Sending: Story = {
  args: { isPending: true },
};

export const ServerError: Story = {
  args: { error: 'Failed to send invitation. Please try again.' },
};

export const SuccessFeedback: Story = {
  args: {
    lastCreated: {
      id: 'inv-001',
      email: 'new-member@example.com',
      role: 'ccc_member',
      organizationId: null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      invitedBy: 'user-001',
    },
  },
};

export const WithCloseButton: Story = {
  args: {
    onClose: fn(),
  },
};
