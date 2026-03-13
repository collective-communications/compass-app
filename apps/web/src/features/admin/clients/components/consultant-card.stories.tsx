import type { Meta, StoryObj } from '@storybook/react-vite';
import { ConsultantCard } from './consultant-card';

const meta = {
  title: 'Features/Admin/Clients/ConsultantCard',
  component: ConsultantCard,
  args: {
    orgId: 'org-001',
  },
} satisfies Meta<typeof ConsultantCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
