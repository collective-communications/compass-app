import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { SurveyFooter } from './survey-footer';

const meta = {
  title: 'Components/Survey/SurveyFooter',
  component: SurveyFooter,
  parameters: { layout: 'fullscreen' },
  args: {
    onHelpClick: fn(),
  },
} satisfies Meta<typeof SurveyFooter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
