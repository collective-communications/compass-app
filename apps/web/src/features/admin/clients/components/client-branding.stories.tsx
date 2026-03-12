import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { ClientBranding } from './client-branding';

const meta = {
  title: 'Features/Admin/Clients/ClientBranding',
  component: ClientBranding,
  args: {
    branding: {
      displayName: 'Acme Corporation',
      logoUrl: null,
    },
    saveStatus: 'saved',
    onUpdate: fn(),
  },
} satisfies Meta<typeof ClientBranding>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithLogo: Story = {
  args: {
    branding: {
      displayName: 'Acme Corporation',
      logoUrl: 'https://placehold.co/48x48/0A3B4F/white?text=AC',
    },
  },
};

export const EmptyDisplayName: Story = {
  args: {
    branding: {
      displayName: '',
      logoUrl: null,
    },
  },
};

export const Saving: Story = {
  args: { saveStatus: 'saving' },
};

export const SaveError: Story = {
  args: { saveStatus: 'error' },
};
