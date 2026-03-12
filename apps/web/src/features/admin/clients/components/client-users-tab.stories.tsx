import type { Meta, StoryObj } from '@storybook/react';
import { ClientUsersTab } from './client-users-tab';

const meta = {
  title: 'Features/Admin/Clients/ClientUsersTab',
  component: ClientUsersTab,
  args: {
    organizationId: 'org-001',
  },
} satisfies Meta<typeof ClientUsersTab>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
