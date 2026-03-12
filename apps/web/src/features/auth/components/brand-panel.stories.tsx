import type { Meta, StoryObj } from '@storybook/react';
import { BrandPanel } from './brand-panel';

const meta = {
  title: 'Features/Auth/BrandPanel',
  component: BrandPanel,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BrandPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default desktop brand panel (hidden below lg breakpoint). */
export const Default: Story = {};

/** Force visible at any viewport by overriding the hidden class. */
export const AlwaysVisible: Story = {
  decorators: [
    (Story) => (
      <div style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
        <div style={{ width: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--color-core)' }}>
          <Story />
        </div>
      </div>
    ),
  ],
};
