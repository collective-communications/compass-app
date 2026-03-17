import type { Meta, StoryObj } from '@storybook/react-vite';
import { TopIssuesCard } from './top-issues-card';
import type { QuestionScoreRow } from '../../types';

const sampleQuestions: QuestionScoreRow[] = [
  {
    questionId: 'q-1',
    questionText: 'I feel comfortable raising concerns with leadership.',
    dimensionCode: 'core',
    meanScore: 1.8,
    distribution: { 1: 35, 2: 30, 3: 25, 4: 10 },
    responseCount: 100,
    isReverseScored: false,
    subDimensionCode: null,
    subDimensionName: null,
  },
  {
    questionId: 'q-2',
    questionText: 'Communication from leadership is clear and consistent.',
    dimensionCode: 'clarity',
    meanScore: 2.1,
    distribution: { 1: 20, 2: 40, 3: 30, 4: 10 },
    responseCount: 100,
    isReverseScored: false,
    subDimensionCode: null,
    subDimensionName: null,
  },
  {
    questionId: 'q-3',
    questionText: 'I understand how my work connects to organizational goals.',
    dimensionCode: 'clarity',
    meanScore: 2.3,
    distribution: { 1: 15, 2: 35, 3: 35, 4: 15 },
    responseCount: 100,
    isReverseScored: false,
    subDimensionCode: null,
    subDimensionName: null,
  },
  {
    questionId: 'q-4',
    questionText: 'Teams collaborate effectively across departments.',
    dimensionCode: 'collaboration',
    meanScore: 2.5,
    distribution: { 1: 10, 2: 35, 3: 40, 4: 15 },
    responseCount: 100,
    isReverseScored: false,
    subDimensionCode: null,
    subDimensionName: null,
  },
  {
    questionId: 'q-5',
    questionText: 'I feel recognized for my contributions.',
    dimensionCode: 'connection',
    meanScore: 3.2,
    distribution: { 1: 5, 2: 10, 3: 45, 4: 40 },
    responseCount: 100,
    isReverseScored: false,
    subDimensionCode: null,
    subDimensionName: null,
  },
];

const meta = {
  title: 'Features/Results/Groups/TopIssuesCard',
  component: TopIssuesCard,
  args: {
    questions: sampleQuestions,
  },
} satisfies Meta<typeof TopIssuesCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const FiveIssues: Story = {
  args: { limit: 5 },
};

export const SingleIssue: Story = {
  args: { limit: 1 },
};

export const Empty: Story = {
  args: { questions: [] },
};
