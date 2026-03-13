import type { Meta, StoryObj } from '@storybook/react-vite';
import { TopTabBar } from './top-tab-bar';
import type { TabConfig } from '../../lib/navigation';

const clientTabs: TabConfig[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'layout-grid', href: '/dashboard' },
  { id: 'results', label: 'Results', icon: 'compass', href: '/results' },
  { id: 'reports', label: 'Reports', icon: 'file-down', href: '/reports' },
];

const meta = {
  title: 'Components/Navigation/TopTabBar',
  component: TopTabBar,
  parameters: {
    viewport: { defaultViewport: 'responsive' },
  },
  args: {
    tabs: clientTabs,
    activeTabId: 'dashboard',
  },
} satisfies Meta<typeof TopTabBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ResultsActive: Story = {
  args: { activeTabId: 'results' },
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
