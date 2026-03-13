import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import type { Survey } from '@compass/types';
import { SurveyConfigModal } from './survey-config-modal';

const baseSurvey: Survey = {
  id: 'survey-1',
  organizationId: 'org-1',
  title: 'Q1 Culture Assessment',
  description: 'Annual culture assessment for the engineering division.',
  status: 'draft',
  opensAt: '2026-04-01T00:00:00Z',
  closesAt: '2026-04-30T23:59:59Z',
  settings: null,
  scoresCalculated: false,
  scoresCalculatedAt: null,
  createdAt: '2026-03-01T00:00:00Z',
  updatedAt: '2026-03-01T00:00:00Z',
  createdBy: 'user-1',
};

const meta = {
  title: 'Features/Admin/Surveys/SurveyConfigModal',
  component: SurveyConfigModal,
  args: {
    open: true,
    onClose: fn(),
    survey: baseSurvey,
    hasQuestions: true,
    onSave: fn(),
    onDeploy: fn(),
    isPending: false,
  },
} satisfies Meta<typeof SurveyConfigModal>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Modal open with pre-filled survey data, ready to save or deploy. */
export const Default: Story = {};

/** No questions added yet — deploy button disabled. */
export const NoQuestions: Story = {
  args: {
    hasQuestions: false,
  },
};

/** Save/deploy in progress. */
export const Pending: Story = {
  args: {
    isPending: true,
  },
};

/** New untitled survey with no dates. */
export const NewSurvey: Story = {
  args: {
    survey: {
      ...baseSurvey,
      title: 'Untitled Survey',
      description: null,
      opensAt: null,
      closesAt: null,
    },
  },
};

/** Modal closed — renders nothing visible. */
export const Closed: Story = {
  args: {
    open: false,
  },
};
