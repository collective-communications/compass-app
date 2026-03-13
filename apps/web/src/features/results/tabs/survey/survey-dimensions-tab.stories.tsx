import type { Meta, StoryObj } from '@storybook/react-vite';
import { SurveyDimensionsTab, SurveyInsightsContent } from './survey-dimensions-tab';
import type { DimensionScoreMap } from '@compass/scoring';

/**
 * SurveyDimensionsTab uses hooks (useQuestionScores, useOverallScores) internally,
 * so it requires a QueryClient provider and mocked API. Stories render it as-is
 * to verify structure; data fetching should be mocked at the Storybook decorator level.
 */
const meta = {
  title: 'Features/Results/Survey/SurveyDimensionsTab',
  component: SurveyDimensionsTab,
  parameters: {
    docs: {
      description: {
        component:
          'Full survey dimensions tab with internal data fetching. Requires QueryClient and Supabase mocks to render data.',
      },
    },
  },
} satisfies Meta<typeof SurveyDimensionsTab>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    surveyId: 'survey-1',
  },
};

// --- SurveyInsightsContent stories ---

const insightsMeta = {
  title: 'Features/Results/Survey/SurveyInsightsContent',
  component: SurveyInsightsContent,
  decorators: [(Story: React.ComponentType) => <div style={{ maxWidth: 360 }}><Story /></div>],
} satisfies Meta<typeof SurveyInsightsContent>;

const mockScores: DimensionScoreMap = {
  core: { dimensionId: 'd1', dimensionCode: 'core', score: 82, rawScore: 3.28, responseCount: 142 },
  clarity: { dimensionId: 'd2', dimensionCode: 'clarity', score: 68, rawScore: 2.72, responseCount: 142 },
  connection: { dimensionId: 'd3', dimensionCode: 'connection', score: 54, rawScore: 2.16, responseCount: 142 },
  collaboration: { dimensionId: 'd4', dimensionCode: 'collaboration', score: 75, rawScore: 3.0, responseCount: 142 },
};

export const InsightsDefault: StoryObj<typeof insightsMeta> = {
  render: () => (
    <div style={{ maxWidth: 360 }}>
      <SurveyInsightsContent scores={mockScores} />
    </div>
  ),
};
