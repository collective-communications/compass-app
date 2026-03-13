import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { PendingInvitations } from './pending-invitations';
import type { Invitation } from '../services/user-service';

const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
const tomorrowDate = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString();

const sampleInvitations: Invitation[] = [
  {
    id: 'inv-001',
    email: 'alex.rivera@example.com',
    role: 'ccc_member',
    organizationId: null,
    expiresAt: futureDate,
    createdAt: '2026-03-05T00:00:00Z',
    invitedBy: 'user-001',
  },
  {
    id: 'inv-002',
    email: 'priya.sharma@example.com',
    role: 'ccc_admin',
    organizationId: null,
    expiresAt: tomorrowDate,
    createdAt: '2026-03-08T00:00:00Z',
    invitedBy: 'user-001',
  },
  {
    id: 'inv-003',
    email: 'former-candidate@example.com',
    role: 'ccc_member',
    organizationId: null,
    expiresAt: pastDate,
    createdAt: '2026-02-28T00:00:00Z',
    invitedBy: 'user-001',
  },
];

const meta = {
  title: 'Features/Admin/Users/PendingInvitations',
  component: PendingInvitations,
  args: {
    invitations: sampleInvitations,
    onResend: fn(),
    onRevoke: fn(),
    isResending: false,
    isRevoking: false,
    resendError: null,
    revokeError: null,
  },
} satisfies Meta<typeof PendingInvitations>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
  args: { invitations: [] },
};

export const AllExpired: Story = {
  args: {
    invitations: sampleInvitations.map((inv) => ({
      ...inv,
      expiresAt: pastDate,
    })),
  },
};

export const ResendError: Story = {
  args: { resendError: 'Failed to resend invitation.' },
};

export const RevokeError: Story = {
  args: { revokeError: 'Failed to revoke invitation.' },
};

export const Resending: Story = {
  args: { isResending: true },
};

export const Revoking: Story = {
  args: { isRevoking: true },
};
