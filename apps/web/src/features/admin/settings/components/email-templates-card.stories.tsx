import type { Meta, StoryObj } from '@storybook/react-vite';
import { EmailTemplatesCard } from './email-templates-card';

const meta = {
  title: 'Features/Admin/Settings/EmailTemplatesCard',
  component: EmailTemplatesCard,
} satisfies Meta<typeof EmailTemplatesCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
