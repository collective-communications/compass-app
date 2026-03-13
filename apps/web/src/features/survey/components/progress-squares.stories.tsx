import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ProgressSquares } from './progress-squares';
import { SurveyShellDecorator } from '../../../../../../apps/storybook/.storybook/decorators/shells';

const meta = {
  title: 'Features/Survey/ProgressSquares',
  component: ProgressSquares,
  decorators: [SurveyShellDecorator],
  args: {
    onJump: fn(),
  },
} satisfies Meta<typeof ProgressSquares>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Beginning of survey — first question active, none answered. */
export const Start: Story = {
  args: {
    total: 24,
    currentIndex: 0,
    answeredIndices: new Set<number>(),
  },
};

/** Midway through — some questions answered. */
export const Midway: Story = {
  args: {
    total: 24,
    currentIndex: 12,
    answeredIndices: new Set<number>([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]),
  },
};

/** Nearly complete — only a few remaining. */
export const NearlyComplete: Story = {
  args: {
    total: 24,
    currentIndex: 22,
    answeredIndices: new Set<number>(Array.from({ length: 22 }, (_, i) => i)),
  },
};

/** All questions answered. */
export const AllAnswered: Story = {
  args: {
    total: 24,
    currentIndex: 23,
    answeredIndices: new Set<number>(Array.from({ length: 24 }, (_, i) => i)),
  },
};

/** Small survey with few questions. */
export const SmallSurvey: Story = {
  args: {
    total: 6,
    currentIndex: 2,
    answeredIndices: new Set<number>([0, 1]),
  },
};

/** With question texts for tooltip display on hover. */
export const WithTooltips: Story = {
  args: {
    total: 6,
    currentIndex: 3,
    answeredIndices: new Set<number>([0, 1, 2]),
    questionTexts: [
      'Our leadership communicates a clear vision.',
      'I feel safe sharing my ideas at work.',
      'Team collaboration is encouraged here.',
      'I receive regular feedback on my performance.',
      'Our processes support efficient work.',
      'I understand how my work connects to our mission.',
    ],
  },
};
