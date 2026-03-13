import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { SurveyDefaultsCard } from './survey-defaults-card';
import type { SystemSettings } from '../hooks/use-system-settings';

const defaultSettings: SystemSettings = {
  id: 'settings-001',
  anonymity_threshold: 5,
  default_duration_days: 14,
  welcome_message: 'Welcome to the culture assessment. Your responses are completely anonymous and will help us understand how our organization communicates and collaborates.',
  completion_message: 'Thank you for completing the survey. Your input is valuable and will contribute to meaningful organizational insights.',
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
  title: 'Features/Admin/Settings/SurveyDefaultsCard',
  component: SurveyDefaultsCard,
  args: {
    settings: defaultSettings,
    saveStatus: 'saved',
    onUpdateField: fn(),
  },
} satisfies Meta<typeof SurveyDefaultsCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Saving: Story = {
  args: { saveStatus: 'saving' },
};

export const SaveError: Story = {
  args: { saveStatus: 'error' },
};

export const HighThreshold: Story = {
  args: {
    settings: { ...defaultSettings, anonymity_threshold: 15 },
  },
};

export const LongDuration: Story = {
  args: {
    settings: { ...defaultSettings, default_duration_days: 30 },
  },
};
