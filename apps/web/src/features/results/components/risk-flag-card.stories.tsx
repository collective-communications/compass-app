import type { Meta, StoryObj } from '@storybook/react-vite';
import { RiskFlagCard } from './risk-flag-card';

const meta = {
  title: 'Features/Results/RiskFlagCard',
  component: RiskFlagCard,
  decorators: [(Story) => <div style={{ maxWidth: 500 }}><Story /></div>],
} satisfies Meta<typeof RiskFlagCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CriticalRisk: Story = {
  args: {
    title: 'Core Trust Deficit',
    description:
      'Psychological safety scores have dropped below the critical threshold. Immediate SLT intervention recommended.',
    severity: 'critical',
    dimension: 'Core',
  },
};

export const HighRisk: Story = {
  args: {
    title: 'Strategic Misalignment',
    description:
      'Employees report unclear direction and low confidence in organizational priorities.',
    severity: 'high',
    dimension: 'Clarity',
  },
};

export const MediumRisk: Story = {
  args: {
    title: 'Cross-Team Friction',
    description:
      'Collaboration scores indicate moderate difficulty in cross-functional alignment.',
    severity: 'medium',
    dimension: 'Collaboration',
  },
};

export const HealthyStatus: Story = {
  args: {
    title: 'Strong Interpersonal Bonds',
    description:
      'Connection scores are within the healthy range, indicating strong belonging and inclusion.',
    severity: 'healthy',
    dimension: 'Connection',
  },
};
