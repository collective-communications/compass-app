import type { Meta, StoryObj } from '@storybook/react';
import { AdminNotes } from './admin-notes';

const meta = {
  title: 'Features/Admin/Clients/AdminNotes',
  component: AdminNotes,
  args: {
    orgId: 'org-001',
  },
} satisfies Meta<typeof AdminNotes>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
