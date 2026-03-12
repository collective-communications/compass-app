import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { AddClientModal } from './add-client-modal';

const meta = {
  title: 'Features/Admin/Clients/AddClientModal',
  component: AddClientModal,
  args: {
    open: true,
    onClose: fn(),
    onCreated: fn(),
  },
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof AddClientModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Closed: Story = {
  args: { open: false },
};
