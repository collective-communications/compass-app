import type { Meta, StoryObj } from '@storybook/react';
import { BottomTabBar } from './bottom-tab-bar';
import type { TabConfig } from '../../lib/navigation';

const clientTabs: TabConfig[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'layout-grid', href: '/dashboard' },
  { id: 'results', label: 'Results', icon: 'compass', href: '/results' },
  { id: 'reports', label: 'Reports', icon: 'file-down', href: '/reports' },
];

const adminTabs: TabConfig[] = [
  { id: 'clients', label: 'Clients', icon: 'building', href: '/admin/clients' },
  { id: 'settings', label: 'Settings', icon: 'settings', href: '/admin/settings' },
];

const meta = {
  title: 'Components/Navigation/BottomTabBar',
  component: BottomTabBar,
  parameters: {
    layout: 'fullscreen',
    viewport: { defaultViewport: 'mobile1' },
  },
  args: {
    tabs: clientTabs,
    activeTabId: 'dashboard',
  },
} satisfies Meta<typeof BottomTabBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ResultsActive: Story = {
  args: { activeTabId: 'results' },
};

export const AdminTabs: Story = {
  args: { tabs: adminTabs, activeTabId: 'clients' },
};

export const WithDisabledTab: Story = {
  args: {
    tabs: [
      ...clientTabs.slice(0, 2),
      { id: 'reports', label: 'Reports', icon: 'file-down', href: '/reports', disabled: true },
    ],
    activeTabId: 'dashboard',
  },
};

export const NoActiveTab: Story = {
  args: { activeTabId: null },
};
