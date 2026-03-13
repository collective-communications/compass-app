import type { Meta, StoryObj } from '@storybook/react-vite';
import { InlineHint } from './inline-hint';

const meta = {
  title: 'Components/Help/InlineHint',
  component: InlineHint,
  args: {
    text: 'Select the option that best describes your experience.',
  },
} satisfies Meta<typeof InlineHint>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithFormField: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <label htmlFor="example" style={{ fontSize: '14px', fontWeight: 500 }}>
        Email address
      </label>
      <input
        id="example"
        type="email"
        aria-describedby="email-hint"
        style={{
          padding: '8px 12px',
          border: '1px solid var(--grey-300)',
          borderRadius: '6px',
          fontSize: '14px',
        }}
      />
      <InlineHint id="email-hint" text="We will never share your email with anyone." />
    </div>
  ),
};
