import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { DimensionNavItem } from './dimension-nav-item';

const meta = {
  title: 'Features/Results/Compass/DimensionNavItem',
  component: DimensionNavItem,
  decorators: [(Story) => <div style={{ maxWidth: 220 }}><Story /></div>],
  args: {
    onClick: fn(),
  },
} satisfies Meta<typeof DimensionNavItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ActiveCore: Story = {
  args: {
    id: 'core',
    label: 'Core',
    score: 82,
    color: '#0C3D50',
    isActive: true,
  },
};

export const InactiveClarity: Story = {
  args: {
    id: 'clarity',
    label: 'Clarity',
    score: 68,
    color: '#FF7F50',
    isActive: false,
  },
};

export const WithCriticalRisk: Story = {
  args: {
    id: 'connection',
    label: 'Connection',
    score: 38,
    color: '#9FD7C3',
    isActive: false,
    severity: 'critical',
  },
};

export const WithHighRisk: Story = {
  args: {
    id: 'collaboration',
    label: 'Collaboration',
    score: 45,
    color: '#E8B4A8',
    isActive: false,
    severity: 'high',
  },
};

export const WithMediumRisk: Story = {
  args: {
    id: 'clarity',
    label: 'Clarity',
    score: 55,
    color: '#FF7F50',
    isActive: false,
    severity: 'medium',
  },
};

export const Overview: Story = {
  args: {
    id: 'overview',
    label: 'Overview',
    score: 67,
    color: '#424242',
    isActive: true,
  },
};
