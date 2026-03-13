import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { SurveyListPage } from './survey-list-page';
import { AppShellDecorator } from '../../../../../../../apps/storybook/.storybook/decorators/shells';

const meta = {
  title: 'Features/Admin/Surveys/SurveyListPage',
  component: SurveyListPage,
  decorators: [AppShellDecorator],
  args: {
    organizationId: 'org-1',
    userId: 'user-1',
    onSelectSurvey: fn(),
  },
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof SurveyListPage>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Page-level component that fetches data via hooks.
 * In Storybook this will show the loading state by default.
 */
export const Default: Story = {};

/** With drilldown header showing client context. */
export const WithClientContext: Story = {
  args: {
    clientName: 'Acme Corp',
    backTo: '/admin/clients/acme',
  },
};
