import type { Meta, StoryObj } from '@storybook/react-vite';
import { CompassLogo } from './compass-logo';

const meta = {
  title: 'Components/Brand/CompassLogo',
  component: CompassLogo,
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    variant: { control: 'select', options: ['default', 'on-dark'] },
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

export const OnDark: Story = {
  args: { variant: 'on-dark', size: 'lg' },
  decorators: [
    (Story) => (
      <div style={{ background: 'var(--color-interactive)', padding: '2rem', borderRadius: '8px' }}>
        <Story />
      </div>
    ),
  ],
};
