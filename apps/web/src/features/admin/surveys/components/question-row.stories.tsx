import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import type { QuestionWithDimension } from '@compass/types';
import { QuestionRow } from './question-row';

const likertQuestion: QuestionWithDimension = {
  id: 'q-1',
  surveyId: 'survey-1',
  text: 'I feel confident that leadership communicates a clear vision for the organization.',
  description: 'Consider how well you understand the direction the organization is heading.',
  type: 'likert_4',
  reverseScored: false,
  options: null,
  required: true,
  displayOrder: 1,
  diagnosticFocus: 'Leadership alignment',
  recommendedAction: null,
  createdAt: '2026-03-01T00:00:00Z',
  updatedAt: '2026-03-01T00:00:00Z',
  dimension: { id: 'qd-1', questionId: 'q-1', dimensionId: 'dim-clarity', weight: 1 },
};

const meta = {
  title: 'Features/Admin/Surveys/QuestionRow',
  component: QuestionRow,
  args: {
    question: likertQuestion,
    isLocked: false,
    onEdit: fn(),
    questionCode: 'L1',
  },
} satisfies Meta<typeof QuestionRow>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Editable Likert question with drag handle. */
export const Default: Story = {};

/** Reverse-scored question showing the "R" badge. */
export const ReverseScored: Story = {
  args: {
    question: {
      ...likertQuestion,
      id: 'q-2',
      text: 'I often feel disconnected from my team.',
      reverseScored: true,
      diagnosticFocus: null,
      dimension: { id: 'qd-2', questionId: 'q-2', dimensionId: 'dim-connection', weight: 1 },
    },
    questionCode: 'N3',
  },
};

/** Open-text question type. */
export const OpenText: Story = {
  args: {
    question: {
      ...likertQuestion,
      id: 'q-3',
      text: 'What one thing would improve how your team collaborates?',
      type: 'open_text',
      diagnosticFocus: null,
      dimension: { id: 'qd-3', questionId: 'q-3', dimensionId: 'dim-collaboration', weight: 1 },
    },
    questionCode: 'B1',
  },
};

/** Locked question — no drag handle, click disabled. */
export const Locked: Story = {
  args: {
    isLocked: true,
  },
};
