import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { QuestionNavButtons } from './question-nav-buttons';
import { SurveyShellDecorator } from '../../../../../../apps/storybook/.storybook/decorators/shells';

const meta = {
  title: 'Features/Survey/QuestionNavButtons',
  component: QuestionNavButtons,
  decorators: [SurveyShellDecorator],
  args: {
    onPrevious: fn(),
    onNext: fn(),
  },
} satisfies Meta<typeof QuestionNavButtons>;

export default meta;
type Story = StoryObj<typeof meta>;

/** First question — Previous hidden, Next disabled (unanswered). */
export const FirstQuestionUnanswered: Story = {
  args: {
    showPrevious: false,
    nextEnabled: false,
    isLastQuestion: false,
  },
};

/** First question — Previous hidden, Next enabled (answered). */
export const FirstQuestionAnswered: Story = {
  args: {
    showPrevious: false,
    nextEnabled: true,
    isLastQuestion: false,
  },
};

/** Middle question — both buttons visible, Next enabled. */
export const MiddleQuestion: Story = {
  args: {
    showPrevious: true,
    nextEnabled: true,
    isLastQuestion: false,
  },
};

/** Middle question — both buttons visible, Next disabled. */
export const MiddleQuestionUnanswered: Story = {
  args: {
    showPrevious: true,
    nextEnabled: false,
    isLastQuestion: false,
  },
};

/** Last question — button label changes to "Continue". */
export const LastQuestion: Story = {
  args: {
    showPrevious: true,
    nextEnabled: true,
    isLastQuestion: true,
  },
};

/** Last question — unanswered, Continue disabled. */
export const LastQuestionUnanswered: Story = {
  args: {
    showPrevious: true,
    nextEnabled: false,
    isLastQuestion: true,
  },
};
