import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ResponseList } from './response-list';
import type { DialogueResponse } from '../../types';

function makeResponses(count: number): DialogueResponse[] {
  const questions = [
    'What does your organization do well in terms of culture?',
    'What could be improved about internal communication?',
    'Describe a time when you felt your voice was heard.',
  ];
  const bodies = [
    'Leadership has been transparent about organizational changes and that builds trust.',
    'Cross-team collaboration is strong — we share knowledge freely.',
    'The recognition program makes people feel valued for their contributions.',
    'I wish there were more opportunities for direct feedback to the SLT.',
    'Communication between departments could be more consistent.',
  ];
  return Array.from({ length: count }, (_, i) => ({
    id: `resp-${i}`,
    questionId: `q-open-${(i % questions.length) + 1}`,
    questionText: questions[i % questions.length]!,
    responseText: bodies[i % bodies.length]!,
    createdAt: new Date(2025, 10, 15, 10 + i).toISOString(),
  }));
}

const meta = {
  title: 'Features/Results/Dialogue/ResponseList',
  component: ResponseList,
  args: {
    responses: makeResponses(5),
    hasAnyResponses: true,
    onClearFilters: fn(),
  },
} satisfies Meta<typeof ResponseList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ManyResponses: Story = {
  args: { responses: makeResponses(25) },
};

export const NoMatchingFilters: Story = {
  args: {
    responses: [],
    hasAnyResponses: true,
  },
};

export const NoResponsesCollected: Story = {
  args: {
    responses: [],
    hasAnyResponses: false,
  },
};
