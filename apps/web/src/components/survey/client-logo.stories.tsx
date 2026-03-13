import type { Meta, StoryObj } from '@storybook/react-vite';
import { ClientLogo } from './client-logo';

const meta = {
  title: 'Components/Survey/ClientLogo',
  component: ClientLogo,
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
  args: {
    orgName: 'River Valley',
    size: 'md',
  },
} satisfies Meta<typeof ClientLogo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithImage: Story = {
  args: {
    src: 'https://placehold.co/48x48/0A3B4F/ffffff?text=RV',
    orgName: 'River Valley',
    size: 'lg',
  },
};

export const SingleWordName: Story = {
  args: { orgName: 'Acme' },
};

export const EmptyName: Story = {
  args: { orgName: '' },
};

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <ClientLogo orgName="River Valley" size="sm" />
      <ClientLogo orgName="River Valley" size="md" />
      <ClientLogo orgName="River Valley" size="lg" />
    </div>
  ),
};

export const BrokenImage: Story = {
  args: {
    src: 'https://invalid-url-that-will-fail.test/logo.png',
    orgName: 'Broken Image Corp',
    size: 'lg',
  },
};
