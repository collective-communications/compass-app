import type { Meta, StoryObj } from '@storybook/react-vite';
import { ResponseCard } from './response-card';
import type { DialogueResponse } from '../../types';

const sampleResponse: DialogueResponse = {
  id: 'resp-001',
  questionId: 'q-open-1',
  questionText: 'What does your organization do well in terms of culture?',
  responseText:
    'I appreciate the open-door policy our leadership maintains. There is a genuine willingness to listen and act on employee concerns. The quarterly town halls have been particularly effective at building trust across departments.',
  createdAt: '2025-11-15T14:30:00Z',
};

const shortResponse: DialogueResponse = {
  id: 'resp-002',
  questionId: 'q-open-2',
  questionText: 'What could be improved about internal communication?',
  responseText: 'More frequent updates from the SLT would help.',
  createdAt: '2025-11-15T15:00:00Z',
};

const longResponse: DialogueResponse = {
  id: 'resp-003',
  questionId: 'q-open-1',
  questionText: 'What does your organization do well in terms of culture?',
  responseText:
    'The culture here has really evolved over the past two years. When I first joined, there was a noticeable disconnect between departments — people worked in silos and rarely collaborated outside their immediate teams. Since the new leadership initiative, we have seen a dramatic shift. Cross-functional projects are now the norm, and the monthly "connection circles" give people a chance to share ideas and build relationships they otherwise would not have. The recognition program has also been a game-changer. Feeling valued for contributions, even small ones, has boosted morale significantly.',
  createdAt: '2025-11-16T09:00:00Z',
};

const meta = {
  title: 'Features/Results/Dialogue/ResponseCard',
  component: ResponseCard,
  args: {
    response: sampleResponse,
  },
} satisfies Meta<typeof ResponseCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ShortResponse: Story = {
  args: { response: shortResponse },
};

export const LongResponse: Story = {
  args: { response: longResponse },
};
