import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { SearchX, Inbox } from 'lucide-react';
import { EmptyState } from './empty-state';

const meta = {
  title: 'Components/Help/EmptyState',
  component: EmptyState,
  args: {
    title: 'No results found',
    subtitle: 'Try adjusting your search or filter criteria.',
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithIcon: Story = {
  args: {
    icon: <SearchX size={48} strokeWidth={1.5} style={{ color: 'var(--grey-400)' }} />,
    title: 'No results found',
    subtitle: 'We could not find anything matching your search.',
  },
};

export const WithActions: Story = {
  args: {
    icon: <Inbox size={48} strokeWidth={1.5} style={{ color: 'var(--grey-400)' }} />,
    title: 'No surveys yet',
    subtitle: 'Create your first survey to get started.',
    actions: [
      { label: 'Create survey', onClick: fn(), variant: 'default' },
      { label: 'Learn more', onClick: fn(), variant: 'outline' },
    ],
  },
};

export const SingleAction: Story = {
  args: {
    title: 'Nothing here',
    subtitle: 'This section is empty.',
    actions: [{ label: 'Go back', onClick: fn(), variant: 'outline' }],
  },
};
