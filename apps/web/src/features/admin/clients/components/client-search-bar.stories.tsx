import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { ClientSearchBar } from './client-search-bar';

const meta = {
  title: 'Features/Admin/Clients/ClientSearchBar',
  component: ClientSearchBar,
  args: {
    searchQuery: '',
    onSearchChange: fn(),
    totalClients: 12,
    activeSurveys: 4,
  },
} satisfies Meta<typeof ClientSearchBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithQuery: Story = {
  args: { searchQuery: 'Maple' },
};

export const SingleClient: Story = {
  args: { totalClients: 1, activeSurveys: 1 },
};

export const NoClients: Story = {
  args: { totalClients: 0, activeSurveys: 0 },
};
