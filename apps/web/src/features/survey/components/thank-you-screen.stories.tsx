import type { Meta, StoryObj } from '@storybook/react-vite';
import { ThankYouScreen } from './thank-you-screen';
import { SurveyShellDecorator } from '../../../../../../apps/storybook/.storybook/decorators/shells';

const meta = {
  title: 'Features/Survey/ThankYouScreen',
  component: ThankYouScreen,
  decorators: [SurveyShellDecorator],
} satisfies Meta<typeof ThankYouScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default — no return link. */
export const Default: Story = {
  args: {},
};

/** With organization return link. */
export const WithReturnLink: Story = {
  args: {
    organizationUrl: 'https://example.com',
    organizationName: 'Acme Corp',
  },
};

/** With return link but no organization name — falls back to "organization". */
export const WithReturnLinkNoName: Story = {
  args: {
    organizationUrl: 'https://example.com',
  },
};
