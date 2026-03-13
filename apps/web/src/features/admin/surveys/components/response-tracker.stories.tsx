import type { Meta, StoryObj } from '@storybook/react-vite';
import { ResponseTracker } from './response-tracker';
import type { ResponseMetrics } from '../services/deployment-service';
import { AppShellDecorator } from '../../../../../../storybook/.storybook/decorators/shells';

const baseMetrics: ResponseMetrics = {
  totalResponses: 87,
  completedResponses: 64,
  completionRate: 73.6,
  averageCompletionTimeMs: 540_000,
  departmentBreakdown: [
    { department: 'Engineering', count: 28 },
    { department: 'Marketing', count: 15 },
    { department: 'Sales', count: 12 },
    { department: 'Operations', count: 9 },
  ],
  dailyCompletions: [],
};

const meta = {
  title: 'Features/Admin/Surveys/ResponseTracker',
  component: ResponseTracker,
  decorators: [AppShellDecorator],
  args: {
    metrics: baseMetrics,
    connectionStatus: 'connected',
  },
} satisfies Meta<typeof ResponseTracker>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Live connection with department breakdown. */
export const Default: Story = {};

/** Polling fallback mode. */
export const Polling: Story = {
  args: {
    connectionStatus: 'polling',
  },
};

/** Disconnected from realtime. */
export const Disconnected: Story = {
  args: {
    connectionStatus: 'disconnected',
  },
};

/** Early survey — few responses, no average time yet. */
export const EarlyStage: Story = {
  args: {
    metrics: {
      totalResponses: 3,
      completedResponses: 1,
      completionRate: 33.3,
      averageCompletionTimeMs: null,
      departmentBreakdown: [],
      dailyCompletions: [],
    },
  },
};

/** Full completion. */
export const FullCompletion: Story = {
  args: {
    metrics: {
      ...baseMetrics,
      totalResponses: 120,
      completedResponses: 120,
      completionRate: 100,
    },
  },
};
