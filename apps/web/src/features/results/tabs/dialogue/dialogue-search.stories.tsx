import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { DialogueSearch } from './dialogue-search';

const meta = {
  title: 'Features/Results/Dialogue/DialogueSearch',
  component: DialogueSearch,
  args: {
    value: '',
    onChange: fn(),
  },
} satisfies Meta<typeof DialogueSearch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithValue: Story = {
  args: { value: 'leadership communication' },
};

export const ShortQuery: Story = {
  args: { value: 'trust' },
};
