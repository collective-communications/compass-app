import type { Meta, StoryObj } from '@storybook/react-vite';
import { DimensionHeaderCard } from './dimension-header-card';
import type { QuestionScoreRow } from '../../types';

const coreQuestions: QuestionScoreRow[] = [
  { questionId: 'q1', questionText: 'I feel safe to speak up at work.', dimensionCode: 'core', meanScore: 0.82, distribution: { 1: 3, 2: 8, 3: 40, 4: 49 }, responseCount: 142, isReverseScored: false, subDimensionCode: null, subDimensionName: null },
  { questionId: 'q2', questionText: 'I trust my direct supervisor.', dimensionCode: 'core', meanScore: 0.78, distribution: { 1: 5, 2: 12, 3: 38, 4: 45 }, responseCount: 142, isReverseScored: false, subDimensionCode: null, subDimensionName: null },
  { questionId: 'q3', questionText: 'Mistakes are held against people here.', dimensionCode: 'core', meanScore: 0.72, distribution: { 1: 8, 2: 15, 3: 35, 4: 42 }, responseCount: 142, isReverseScored: true, subDimensionCode: null, subDimensionName: null },
];

const meta = {
  title: 'Features/Results/Survey/DimensionHeaderCard',
  component: DimensionHeaderCard,
  decorators: [(Story) => <div style={{ maxWidth: 600 }}><Story /></div>],
} satisfies Meta<typeof DimensionHeaderCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Core: Story = {
  args: {
    dimensionName: 'Core',
    score: 82,
    color: '#0C3D50',
    questions: coreQuestions,
  },
};

export const WithSubDimensions: Story = {
  args: {
    dimensionName: 'Core',
    score: 82,
    color: '#0C3D50',
    questions: coreQuestions,
    subDimensionScores: [
      { subDimensionCode: 'trust_safety', dimensionCode: 'core', score: 85, rawScore: 3.4, responseCount: 284 },
      { subDimensionCode: 'psychological_safety', dimensionCode: 'core', score: 78, rawScore: 3.1, responseCount: 284 },
      { subDimensionCode: 'vulnerability', dimensionCode: 'core', score: 72, rawScore: 2.9, responseCount: 142 },
    ],
  },
};

export const Clarity: Story = {
  args: {
    dimensionName: 'Clarity',
    score: 68,
    color: '#FF7F50',
    questions: [
      { questionId: 'q4', questionText: 'I understand how my work contributes to organizational goals.', dimensionCode: 'clarity', meanScore: 0.7, distribution: { 1: 10, 2: 18, 3: 38, 4: 34 }, responseCount: 142, isReverseScored: false, subDimensionCode: null, subDimensionName: null },
      { questionId: 'q5', questionText: 'Expectations for my role are clearly defined.', dimensionCode: 'clarity', meanScore: 0.66, distribution: { 1: 12, 2: 20, 3: 36, 4: 32 }, responseCount: 142, isReverseScored: false, subDimensionCode: null, subDimensionName: null },
    ],
  },
};

export const SingleQuestion: Story = {
  args: {
    dimensionName: 'Connection',
    score: 54,
    color: '#9FD7C3',
    questions: [
      { questionId: 'q6', questionText: 'I feel a sense of belonging at work.', dimensionCode: 'connection', meanScore: 0.54, distribution: { 1: 20, 2: 25, 3: 30, 4: 25 }, responseCount: 142, isReverseScored: false, subDimensionCode: null, subDimensionName: null },
    ],
  },
};

export const FivePointScale: Story = {
  args: {
    dimensionName: 'Core',
    score: 75,
    color: '#0C3D50',
    scaleSize: 5,
    questions: [
      { questionId: 'q7', questionText: 'I feel safe to speak up at work.', dimensionCode: 'core', meanScore: 3.8, distribution: { 1: 2, 2: 5, 3: 15, 4: 38, 5: 40 }, responseCount: 142, isReverseScored: false, subDimensionCode: null, subDimensionName: null },
      { questionId: 'q8', questionText: 'I trust my direct supervisor.', dimensionCode: 'core', meanScore: 3.5, distribution: { 1: 3, 2: 8, 3: 20, 4: 35, 5: 34 }, responseCount: 142, isReverseScored: false, subDimensionCode: null, subDimensionName: null },
    ],
  },
};
