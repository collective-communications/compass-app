import type { Meta, StoryObj } from '@storybook/react';
import { BaseLayout } from './base-layout';

const meta = {
  title: 'Components/Shells/BaseLayout',
  component: BaseLayout,
  parameters: { layout: 'fullscreen' },
  args: {
    header: (
      <div style={{ padding: '12px 24px', fontWeight: 500 }}>Header</div>
    ),
    children: (
      <div style={{ padding: '24px' }}>
        <p>Main content area</p>
      </div>
    ),
  },
} satisfies Meta<typeof BaseLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithFooter: Story = {
  args: {
    header: (
      <div style={{ padding: '12px 24px', fontWeight: 500 }}>Header</div>
    ),
    children: (
      <div style={{ padding: '24px' }}>
        <p>Main content area with footer below</p>
      </div>
    ),
    footer: (
      <div style={{ padding: '12px 24px', fontSize: '13px', color: 'var(--grey-500)' }}>
        Footer content
      </div>
    ),
  },
};

export const WithClassName: Story = {
  args: {
    className: 'bg-red-50',
    header: (
      <div style={{ padding: '12px 24px', fontWeight: 500 }}>Custom class applied</div>
    ),
    children: (
      <div style={{ padding: '24px' }}>
        <p>Content with custom className on container</p>
      </div>
    ),
  },
};
