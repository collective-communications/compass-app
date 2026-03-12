import type { Meta, StoryObj } from '@storybook/react';
import { RiskFlagCard } from './risk-flag-card';
import type { RiskFlag } from '@compass/scoring';

const meta = {
  title: 'Features/Results/Compass/RiskFlagCard',
  component: RiskFlagCard,
  decorators: [(Story) => <div style={{ maxWidth: 500 }}><Story /></div>],
} satisfies Meta<typeof RiskFlagCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Critical: Story = {
  args: {
    flag: {
      dimensionCode: 'core',
      dimensionName: 'Core',
      severity: 'critical',
      score: 35,
      message: 'Core trust is severely compromised. Immediate SLT intervention required to restore psychological safety.',
    } satisfies RiskFlag,
  },
};

export const High: Story = {
  args: {
    flag: {
      dimensionCode: 'connection',
      dimensionName: 'Connection',
      severity: 'high',
      score: 42,
      message: 'Interpersonal bonds are weak across the organization. Team-building and inclusion initiatives recommended.',
    } satisfies RiskFlag,
  },
};

export const Medium: Story = {
  args: {
    flag: {
      dimensionCode: 'clarity',
      dimensionName: 'Clarity',
      severity: 'medium',
      score: 58,
      message: 'Strategic alignment is moderate. Consider cascading priorities more effectively.',
    } satisfies RiskFlag,
  },
};

export const Healthy: Story = {
  args: {
    flag: {
      dimensionCode: 'collaboration',
      dimensionName: 'Collaboration',
      severity: 'healthy',
      score: 82,
      message: 'Collaboration is strong across teams. Maintain current practices.',
    } satisfies RiskFlag,
  },
};
