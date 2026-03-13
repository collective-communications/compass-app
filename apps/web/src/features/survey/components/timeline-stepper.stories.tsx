import type { Meta, StoryObj } from '@storybook/react-vite';
import { TimelineStepper } from './timeline-stepper';
import { SurveyShellDecorator } from '../../../../../../apps/storybook/.storybook/decorators/shells';

const meta = {
  title: 'Features/Survey/TimelineStepper',
  component: TimelineStepper,
  decorators: [SurveyShellDecorator],
} satisfies Meta<typeof TimelineStepper>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default three-step timeline as used on the thank-you screen. */
export const Default: Story = {
  args: {
    steps: [
      { title: 'Results compiled', subtitle: 'After the survey closes' },
      { title: 'Leadership review', subtitle: 'Results shared with leadership' },
      { title: 'Organization update', subtitle: 'Key findings shared with team' },
    ],
  },
};

/** Single step. */
export const SingleStep: Story = {
  args: {
    steps: [{ title: 'Processing complete', subtitle: 'Your data has been recorded' }],
  },
};

/** Five steps — longer timeline. */
export const FiveSteps: Story = {
  args: {
    steps: [
      { title: 'Survey closes', subtitle: 'March 31, 2026' },
      { title: 'Data analysis', subtitle: 'Results compiled and scored' },
      { title: 'Leadership review', subtitle: 'SLT reviews findings' },
      { title: 'Action planning', subtitle: 'Priorities identified' },
      { title: 'Organization update', subtitle: 'Key findings shared with team' },
    ],
  },
};
