import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { SurveyHeader } from './survey-header';

const meta = {
  title: 'Components/Survey/SurveyHeader',
  component: SurveyHeader,
  parameters: { layout: 'fullscreen' },
  args: {
    orgName: 'River Valley Health Authority',
  },
} satisfies Meta<typeof SurveyHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithLogo: Story = {
  args: {
    orgName: 'Acme Corporation',
    logoUrl: 'https://placehold.co/32x32/0A3B4F/ffffff?text=AC',
  },
};

export const WithSaveButton: Story = {
  args: {
    orgName: 'River Valley Health Authority',
    onSave: fn(),
  },
};

export const LongOrgName: Story = {
  args: {
    orgName: 'The Very Long Organization Name That Should Truncate Properly In The Header',
  },
};
