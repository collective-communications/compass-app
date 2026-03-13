import type { Meta, StoryObj } from '@storybook/react-vite';
import { RiskFlagList } from './risk-flag-list';
import type { RiskFlag } from '@compass/scoring';

const meta = {
  title: 'Features/Results/Compass/RiskFlagList',
  component: RiskFlagList,
  decorators: [(Story) => <div style={{ maxWidth: 500 }}><Story /></div>],
} satisfies Meta<typeof RiskFlagList>;

export default meta;
type Story = StoryObj<typeof meta>;

const mixedFlags: RiskFlag[] = [
  { dimensionCode: 'core', dimensionName: 'Core', severity: 'critical', score: 35, message: 'Core trust critically low — immediate action needed.' },
  { dimensionCode: 'connection', dimensionName: 'Connection', severity: 'high', score: 42, message: 'Interpersonal bonds weak across the organization.' },
  { dimensionCode: 'clarity', dimensionName: 'Clarity', severity: 'medium', score: 58, message: 'Strategic alignment is moderate.' },
];

export const MultipleRisks: Story = {
  args: { flags: mixedFlags },
};

export const SingleCritical: Story = {
  args: {
    flags: [
      { dimensionCode: 'core', dimensionName: 'Core', severity: 'critical', score: 28, message: 'Psychological safety severely compromised.' },
    ],
  },
};

export const AllHealthy: Story = {
  args: {
    flags: [
      { dimensionCode: 'core', dimensionName: 'Core', severity: 'healthy', score: 85, message: 'Core is healthy.' },
      { dimensionCode: 'clarity', dimensionName: 'Clarity', severity: 'healthy', score: 80, message: 'Clarity is healthy.' },
    ],
  },
};

export const Empty: Story = {
  args: { flags: [] },
};
