import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import type { Question } from '@compass/types';
import { EditQuestionDialog } from './edit-question-dialog';

const baseQuestion: Question = {
  id: 'q-1',
  surveyId: 'survey-1',
  text: 'I feel confident that leadership communicates a clear vision for the organization.',
  description: 'Consider how well you understand the direction the organization is heading.',
  type: 'likert',
  reverseScored: false,
  options: null,
  required: true,
  displayOrder: 1,
  subDimensionId: null,
  diagnosticFocus: 'Leadership alignment',
  recommendedAction: null,
  createdAt: '2026-03-01T00:00:00Z',
  updatedAt: '2026-03-01T00:00:00Z',
};

const meta = {
  title: 'Features/Admin/Surveys/EditQuestionDialog',
  component: EditQuestionDialog,
  args: {
    question: baseQuestion,
    surveyId: 'survey-1',
    isOpen: true,
    onClose: fn(),
    onAutoSaveStatusChange: fn(),
  },
} satisfies Meta<typeof EditQuestionDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Dialog open with a fully populated question. */
export const Default: Story = {};

/** Reverse-scored question with no help text. */
export const ReverseScored: Story = {
  args: {
    question: {
      ...baseQuestion,
      text: 'I often feel disconnected from my team.',
      description: null,
      reverseScored: true,
      diagnosticFocus: null,
    },
  },
};

/** Dialog closed — renders nothing. */
export const Closed: Story = {
  args: {
    isOpen: false,
  },
};
