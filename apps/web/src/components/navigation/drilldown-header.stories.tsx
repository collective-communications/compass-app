import type { Meta, StoryObj } from '@storybook/react-vite';
import { DrilldownHeader } from './drilldown-header';

const meta = {
  title: 'Components/Navigation/DrilldownHeader',
  component: DrilldownHeader,
  decorators: [
    (Story) => (
      <div style={{ padding: '1rem' }}>
        <Story />
      </div>
    ),
  ],
  args: {
    backTo: '/clients',
    backLabel: 'Back to clients',
    title: 'Acme Corporation',
  },
} satisfies Meta<typeof DrilldownHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithActions: Story = {
  args: {
    backTo: '/clients',
    backLabel: 'Back to clients',
    title: 'Survey Builder',
    children: (
      <button
        type="button"
        style={{
          padding: '6px 16px',
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: 500,
          backgroundColor: 'var(--grey-900)',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        Publish
      </button>
    ),
  },
};

export const LongTitle: Story = {
  args: {
    title: 'Organization Culture Assessment — Q4 2025 Comprehensive Review',
  },
};
