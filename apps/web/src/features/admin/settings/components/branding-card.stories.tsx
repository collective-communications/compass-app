import type { Meta, StoryObj } from '@storybook/react-vite';
import { BrandingCard } from './branding-card';
import type { SystemSettings } from '../hooks/use-system-settings';

const defaultSettings: SystemSettings = {
  id: 'settings-001',
  anonymity_threshold: 5,
  default_duration_days: 14,
  welcome_message: 'Welcome to the culture assessment.',
  completion_message: 'Thank you for completing the survey.',
  logo_url: null,
  brand_colors: {
    core: '#0A3B4F',
    clarity: '#FF7F50',
    connection: '#9FD7C3',
    collaboration: '#E8B4A8',
  },
  data_retention_policy: 'indefinite',
  updated_at: '2026-01-15T00:00:00Z',
};

const meta = {
  title: 'Features/Admin/Settings/BrandingCard',
  component: BrandingCard,
  args: {
    settings: defaultSettings,
  },
} satisfies Meta<typeof BrandingCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
