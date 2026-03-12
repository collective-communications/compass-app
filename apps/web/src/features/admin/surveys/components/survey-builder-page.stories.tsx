import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { SurveyBuilderPage } from './survey-builder-page';
import { AppShellDecorator } from '../../../../../../../apps/storybook/.storybook/decorators/shells';

const meta = {
  title: 'Features/Admin/Surveys/SurveyBuilderPage',
  component: SurveyBuilderPage,
  decorators: [AppShellDecorator],
  args: {
    surveyId: 'survey-1',
    onBack: fn(),
  },
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof SurveyBuilderPage>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Page-level component that fetches data via hooks.
 * In Storybook this will show the loading state by default.
 * To see full content, mock the useSurveyBuilder hook at the module level.
 */
export const Default: Story = {};
