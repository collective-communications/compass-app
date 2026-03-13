import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { AccessControlToggle } from './access-control-toggle';

const meta = {
  title: 'Features/Admin/Clients/AccessControlToggle',
  component: AccessControlToggle,
  args: {
    enabled: false,
    saveStatus: 'saved',
    onToggle: fn(),
  },
} satisfies Meta<typeof AccessControlToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Enabled: Story = {
  args: { enabled: true },
};

export const Saving: Story = {
  args: { enabled: true, saveStatus: 'saving' },
};

export const SaveError: Story = {
  args: { enabled: false, saveStatus: 'error' },
};
