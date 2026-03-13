import type { Meta, StoryObj } from '@storybook/react-vite';
import { TrustLadderVisual } from './trust-ladder-visual';
import type { TrustLadderResult, TrustRungScore } from '@compass/types';
import { AppShellDecorator } from '../../../../../../storybook/.storybook/decorators/shells';

function makeRung(
  rung: number,
  name: string,
  dim: string,
  score: number,
  status: TrustRungScore['status'],
): TrustRungScore {
  return { rung, name, dimensionCode: dim as TrustRungScore['dimensionCode'], score, maxScore: 4, status };
}

const fullResult: TrustLadderResult = {
  rungs: [
    makeRung(1, 'Safety', 'core', 3.2, 'achieved'),
    makeRung(2, 'Transparency', 'core', 2.8, 'achieved'),
    makeRung(3, 'Consistency', 'clarity', 2.6, 'achieved'),
    makeRung(4, 'Competence', 'clarity', 2.4, 'achieved'),
    makeRung(5, 'Empathy', 'connection', 2.1, 'in_progress'),
    makeRung(6, 'Recognition', 'connection', 1.8, 'in_progress'),
    makeRung(7, 'Collaboration', 'collaboration', 1.2, 'not_started'),
    makeRung(8, 'Innovation', 'collaboration', 0.8, 'not_started'),
    makeRung(9, 'Advocacy', 'collaboration', 0.4, 'not_started'),
  ],
  currentLevel: 4,
  nextActions: ['Deepen empathy practices', 'Strengthen recognition programs'],
};

const earlyStageResult: TrustLadderResult = {
  rungs: [
    makeRung(1, 'Safety', 'core', 1.5, 'in_progress'),
    makeRung(2, 'Transparency', 'core', 0.8, 'not_started'),
    makeRung(3, 'Consistency', 'clarity', 0.5, 'not_started'),
    makeRung(4, 'Competence', 'clarity', 0.3, 'not_started'),
    makeRung(5, 'Empathy', 'connection', 0.2, 'not_started'),
    makeRung(6, 'Recognition', 'connection', 0.1, 'not_started'),
    makeRung(7, 'Collaboration', 'collaboration', 0.0, 'not_started'),
    makeRung(8, 'Innovation', 'collaboration', 0.0, 'not_started'),
    makeRung(9, 'Advocacy', 'collaboration', 0.0, 'not_started'),
  ],
  currentLevel: 0,
  nextActions: ['Establish psychological safety baseline'],
};

const highTrustResult: TrustLadderResult = {
  rungs: [
    makeRung(1, 'Safety', 'core', 3.8, 'achieved'),
    makeRung(2, 'Transparency', 'core', 3.6, 'achieved'),
    makeRung(3, 'Consistency', 'clarity', 3.5, 'achieved'),
    makeRung(4, 'Competence', 'clarity', 3.4, 'achieved'),
    makeRung(5, 'Empathy', 'connection', 3.3, 'achieved'),
    makeRung(6, 'Recognition', 'connection', 3.2, 'achieved'),
    makeRung(7, 'Collaboration', 'collaboration', 3.0, 'achieved'),
    makeRung(8, 'Innovation', 'collaboration', 2.8, 'achieved'),
    makeRung(9, 'Advocacy', 'collaboration', 2.5, 'in_progress'),
  ],
  currentLevel: 8,
  nextActions: ['Sustain advocacy culture'],
};

const meta = {
  title: 'Features/Results/Recommendations/TrustLadderVisual',
  component: TrustLadderVisual,
  decorators: [AppShellDecorator],
  args: {
    result: fullResult,
  },
} satisfies Meta<typeof TrustLadderVisual>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const EarlyStage: Story = {
  args: { result: earlyStageResult },
};

export const HighTrust: Story = {
  args: { result: highTrustResult },
};
