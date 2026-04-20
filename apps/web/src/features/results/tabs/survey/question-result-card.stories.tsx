import type { Meta, StoryObj } from '@storybook/react-vite';
import { QuestionResultCard } from './question-result-card';

const meta = {
  title: 'Features/Results/Survey/QuestionResultCard',
  component: QuestionResultCard,
  decorators: [(Story) => <div style={{ maxWidth: 600 }}><Story /></div>],
} satisfies Meta<typeof QuestionResultCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const HighScore: Story = {
  args: {
    question: {
      questionId: 'q1',
      questionText: 'I feel safe to speak up at work without fear of negative consequences.',
      dimensionCode: 'core',
      meanScore: 0.85,
      distribution: { 1: 2, 2: 6, 3: 35, 4: 57 },
      responseCount: 142,
      isReverseScored: false,
      subDimensionCode: null,
      subDimensionName: null,
    },
    dimensionColor: '#0C3D50',
  },
};

export const LowScore: Story = {
  args: {
    question: {
      questionId: 'q2',
      questionText: 'I feel a strong sense of belonging at this organization.',
      dimensionCode: 'connection',
      meanScore: 0.42,
      distribution: { 1: 25, 2: 30, 3: 28, 4: 17 },
      responseCount: 142,
      isReverseScored: false,
      subDimensionCode: null,
      subDimensionName: null,
    },
    dimensionColor: '#9FD7C3',
  },
};

export const ReverseScored: Story = {
  args: {
    question: {
      questionId: 'q3',
      questionText: 'Mistakes are held against people in this organization.',
      dimensionCode: 'core',
      meanScore: 0.72,
      distribution: { 1: 8, 2: 15, 3: 35, 4: 42 },
      responseCount: 142,
      isReverseScored: true,
      subDimensionCode: null,
      subDimensionName: null,
    },
    dimensionColor: '#0C3D50',
  },
};

export const ClarityDimension: Story = {
  args: {
    question: {
      questionId: 'q4',
      questionText: 'I understand how my work contributes to organizational goals.',
      dimensionCode: 'clarity',
      meanScore: 0.68,
      distribution: { 1: 10, 2: 18, 3: 38, 4: 34 },
      responseCount: 142,
      isReverseScored: false,
      subDimensionCode: null,
      subDimensionName: null,
    },
    dimensionColor: '#FF7F50',
  },
};

export const CollaborationDimension: Story = {
  args: {
    question: {
      questionId: 'q5',
      questionText: 'Teams in this organization share knowledge effectively.',
      dimensionCode: 'collaboration',
      meanScore: 0.75,
      distribution: { 1: 5, 2: 12, 3: 42, 4: 41 },
      responseCount: 142,
      isReverseScored: false,
      subDimensionCode: null,
      subDimensionName: null,
    },
    dimensionColor: '#E8B4A8',
  },
};
