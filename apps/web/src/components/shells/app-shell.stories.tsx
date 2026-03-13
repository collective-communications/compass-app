import type { Meta, StoryObj } from '@storybook/react-vite';
import { AppShellDecorator } from '../../../../storybook/.storybook/decorators/shells';

/**
 * AppShell requires auth context and router state, so we render it
 * using the AppShellDecorator which provides a static chrome approximation.
 * The actual AppShell component is tested via integration/E2E tests.
 */
const meta = {
  title: 'Components/Shells/AppShell',
  decorators: [AppShellDecorator],
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div style={{ padding: '24px' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '16px' }}>
        Dashboard
      </h2>
      <p style={{ color: 'var(--grey-500)', fontSize: '14px' }}>
        This shows the AppShell decorator wrapping page content.
      </p>
    </div>
  ),
};
