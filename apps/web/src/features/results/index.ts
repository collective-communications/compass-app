/** Results feature — barrel export. */

// Components
export { ResultsLayout } from './components/results-layout';
export { InsightsPanel } from './components/insights-panel';
export { SurveyPicker } from './components/survey-picker';
export { ResultsSkeleton } from './components/results-skeleton';
export { LikertBarChart } from './components/likert-bar-chart';

// Tabs
export { CompassTab, CompassInsightsContent } from './tabs/compass';
export { SurveyDimensionsTab } from './tabs/survey';
export { GroupsTab, GroupsInsights } from './tabs/groups';
export { RecommendationsTab, RecommendationsInsightsContent } from './tabs/recommendations';
export { DialogueTab, DialogueInsightsContent } from './tabs/dialogue';

// Routes
export { createResultsRoutes } from './routes';

// Hooks
export { useOverallScores } from './hooks/use-overall-scores';
export { useSegmentScores } from './hooks/use-segment-scores';
export { useArchetype } from './hooks/use-archetype';
export { useRiskFlags } from './hooks/use-risk-flags';
export { useRecommendations } from './hooks/use-recommendations';
export { useDialogueResponses } from './hooks/use-dialogue-responses';
export { useQuestionScores } from './hooks/use-question-scores';
export { useScoredSurveys } from './hooks/use-scored-surveys';

// Query keys
export { resultKeys } from './lib/query-keys';

// Types
export type {
  DimensionScoreRow,
  QuestionScoreRow,
  LikertDistribution,
  DialogueResponse,
  Recommendation,
  ScoredSurvey,
  OverallScores,
  ResultsTabId,
  ResultsTab,
} from './types';

export { RESULTS_TABS, createEmptyDistribution } from './types';
