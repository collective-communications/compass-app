import type { Meta, StoryObj } from '@storybook/react';
import { DataSecurityCard } from './data-security-card';

const meta = {
  title: 'Features/Admin/Settings/DataSecurityCard',
  component: DataSecurityCard,
} satisfies Meta<typeof DataSecurityCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
