import type { Meta, StoryObj } from '@storybook/react-vite';
import { QuestionResultList } from './question-result-list';
import type { QuestionScoreRow } from '../../types';

const coreQuestions: QuestionScoreRow[] = [
  { questionId: 'q1', questionText: 'I feel safe to speak up at work.', dimensionCode: 'core', meanScore: 0.85, distribution: { 1: 2, 2: 6, 3: 35, 4: 57 }, responseCount: 142, isReverseScored: false },
  { questionId: 'q2', questionText: 'I trust my direct supervisor.', dimensionCode: 'core', meanScore: 0.78, distribution: { 1: 5, 2: 12, 3: 38, 4: 45 }, responseCount: 142, isReverseScored: false },
  { questionId: 'q3', questionText: 'Mistakes are held against people here.', dimensionCode: 'core', meanScore: 0.72, distribution: { 1: 8, 2: 15, 3: 35, 4: 42 }, responseCount: 142, isReverseScored: true },
  { questionId: 'q4', questionText: 'I can be myself at work.', dimensionCode: 'core', meanScore: 0.80, distribution: { 1: 4, 2: 10, 3: 36, 4: 50 }, responseCount: 142, isReverseScored: false },
];

const meta = {
  title: 'Features/Results/Survey/QuestionResultList',
  component: QuestionResultList,
  decorators: [(Story) => <div style={{ maxWidth: 600 }}><Story /></div>],
} satisfies Meta<typeof QuestionResultList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CoreDimension: Story = {
  args: {
    questions: coreQuestions,
    dimensionColor: '#0A3B4F',
  },
};

export const SingleQuestion: Story = {
  args: {
    questions: [coreQuestions[0]!],
    dimensionColor: '#FF7F50',
  },
};

export const Empty: Story = {
  args: {
    questions: [],
    dimensionColor: '#0A3B4F',
  },
};
