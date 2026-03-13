import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { HelpDrawer } from './help-drawer';
import { registerHelpContent } from './help-content-store';

// Register mock help content for the default storybook route
registerHelpContent('/', {
  title: 'Getting Started',
  sections: [
    {
      heading: 'Welcome',
      content: 'This is an overview of how to use the application. Browse through sections for detailed guidance.',
    },
    {
      heading: 'Keyboard Shortcuts',
      content: 'Use keyboard shortcuts to navigate quickly through the survey.',
      keyboardShortcuts: ['1-4', 'Enter', 'Backspace', 'Esc'],
    },
    {
      heading: 'Need more help?',
      content: 'Contact your organization administrator for additional support.',
    },
  ],
});

const meta = {
  title: 'Components/Help/HelpDrawer',
  component: HelpDrawer,
  args: {
    isOpen: true,
    onClose: fn(),
  },
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof HelpDrawer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {};

export const Closed: Story = {
  args: { isOpen: false },
};
