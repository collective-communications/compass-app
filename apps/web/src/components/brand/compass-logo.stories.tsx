import type { Meta, StoryObj } from '@storybook/react';
import { CompassLogo } from './compass-logo';

const meta = {
  title: 'Components/Brand/CompassLogo',
  component: CompassLogo,
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
} satisfies Meta<typeof CompassLogo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Small: Story = {
  args: { size: 'sm' },
};

export const Medium: Story = {
  args: { size: 'md' },
};

export const Large: Story = {
  args: { size: 'lg' },
};

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <CompassLogo size="sm" />
      <CompassLogo size="md" />
      <CompassLogo size="lg" />
    </div>
  ),
};
