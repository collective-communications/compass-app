import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { TopicFilter, type Topic } from './topic-filter';

const sampleTopics: Topic[] = [
  {
    questionId: 'q-open-1',
    label: 'What does your organization do...',
    fullText: 'What does your organization do well in terms of culture?',
    count: 42,
  },
  {
    questionId: 'q-open-2',
    label: 'What could be improved about...',
    fullText: 'What could be improved about internal communication?',
    count: 38,
  },
  {
    questionId: 'q-open-3',
    label: 'Describe a time when you felt...',
    fullText: 'Describe a time when you felt your voice was heard.',
    count: 27,
  },
];

const meta = {
  title: 'Features/Results/Dialogue/TopicFilter',
  component: TopicFilter,
  args: {
    topics: sampleTopics,
    activeTopicId: null,
    onTopicChange: fn(),
  },
} satisfies Meta<typeof TopicFilter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const TopicSelected: Story = {
  args: { activeTopicId: 'q-open-2' },
};

export const SingleTopic: Story = {
  args: { topics: [sampleTopics[0]!] },
};

export const Empty: Story = {
  args: { topics: [] },
};
