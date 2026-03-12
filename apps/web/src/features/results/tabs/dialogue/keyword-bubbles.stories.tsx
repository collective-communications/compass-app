import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { KeywordBubbles, type Keyword } from './keyword-bubbles';

const sampleKeywords: Keyword[] = [
  { text: 'leadership', count: 24 },
  { text: 'communication', count: 19 },
  { text: 'trust', count: 17 },
  { text: 'transparency', count: 14 },
  { text: 'collaboration', count: 12 },
  { text: 'feedback', count: 11 },
  { text: 'recognition', count: 9 },
  { text: 'accountability', count: 8 },
  { text: 'support', count: 7 },
  { text: 'growth', count: 6 },
  { text: 'inclusion', count: 5 },
  { text: 'values', count: 4 },
  { text: 'respect', count: 3 },
  { text: 'safety', count: 2 },
];

const meta = {
  title: 'Features/Results/Dialogue/KeywordBubbles',
  component: KeywordBubbles,
  args: {
    keywords: sampleKeywords,
    activeKeyword: null,
    onKeywordClick: fn(),
  },
} satisfies Meta<typeof KeywordBubbles>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithActiveKeyword: Story = {
  args: { activeKeyword: 'trust' },
};

export const FewKeywords: Story = {
  args: {
    keywords: sampleKeywords.slice(0, 3),
  },
};

export const SingleKeyword: Story = {
  args: {
    keywords: [{ text: 'leadership', count: 10 }],
  },
};

export const Empty: Story = {
  args: { keywords: [] },
};
