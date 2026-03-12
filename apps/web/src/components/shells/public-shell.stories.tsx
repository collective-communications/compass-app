import type { Meta, StoryObj } from '@storybook/react';
import { PublicShell } from './public-shell';

const meta = {
  title: 'Components/Shells/PublicShell',
  component: PublicShell,
  parameters: { layout: 'fullscreen' },
  args: {
    children: (
      <div style={{ padding: '24px', maxWidth: '480px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '16px' }}>
          Sign in
        </h2>
        <p style={{ color: 'var(--grey-500)', fontSize: '14px' }}>
          Enter your credentials to access the platform.
        </p>
      </div>
    ),
  },
} satisfies Meta<typeof PublicShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
