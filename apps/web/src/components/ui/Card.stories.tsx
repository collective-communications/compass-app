import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card } from './card';

const meta = {
  title: 'Components/UI/Card',
  component: Card,
  argTypes: {
    severity: {
      control: 'select',
      options: [undefined, 'critical', 'high', 'medium', 'healthy'],
    },
    children: { control: 'text' },
  },
  args: {
    children: 'Card content goes here',
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Critical: Story = {
  args: { severity: 'critical', children: 'Critical severity card' },
};

export const High: Story = {
  args: { severity: 'high', children: 'High severity card' },
};

export const Medium: Story = {
  args: { severity: 'medium', children: 'Medium severity card' },
};

export const Healthy: Story = {
  args: { severity: 'healthy', children: 'Healthy severity card' },
};

export const AllSeverities: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <Card>Default card</Card>
      <Card severity="critical">Critical</Card>
      <Card severity="high">High</Card>
      <Card severity="medium">Medium</Card>
      <Card severity="healthy">Healthy</Card>
    </div>
  ),
};
