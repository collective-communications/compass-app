import type { Meta, StoryObj } from '@storybook/react';
import { ServiceLinksCard } from './service-links-card';

const meta = {
  title: 'Features/Results/Recommendations/ServiceLinksCard',
  component: ServiceLinksCard,
} satisfies Meta<typeof ServiceLinksCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
