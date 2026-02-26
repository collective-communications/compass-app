export { SurveyListPage } from './components/survey-list-page';
export { SurveyCard } from './components/survey-card';
export { SurveyBuilderPage } from './components/survey-builder-page';
export { QuestionRow } from './components/question-row';
export { EditQuestionDialog } from './components/edit-question-dialog';
export { DimensionNav } from './components/dimension-nav';
export { AutoSaveIndicator } from './components/auto-save-indicator';
export type { AutoSaveStatus } from './components/auto-save-indicator';

export { useSurveys, surveyListKeys } from './hooks/use-surveys';
export { useSurveyBuilder, surveyBuilderKeys } from './hooks/use-survey-builder';
export { useCreateSurvey } from './hooks/use-create-survey';
export { useReorderQuestions } from './hooks/use-reorder-questions';

export {
  listSurveys,
  getSurveyBuilderData,
  createSurvey,
  updateQuestion,
  reorderQuestions,
  updateSurveyStatus,
  listTemplates,
} from './services/admin-survey-service';
export type {
  SurveyListItem,
  SurveyBuilderData,
  CreateSurveyParams,
  UpdateQuestionParams,
  ReorderQuestionParams,
} from './services/admin-survey-service';

// S22: Deployment & Tracking
export { SurveyConfigModal } from './components/survey-config-modal';
export type { SurveyConfigModalProps, SurveyConfigFormData } from './components/survey-config-modal';
export { DeploymentPanel } from './components/deployment-panel';
export type { DeploymentPanelProps } from './components/deployment-panel';
export { ResponseTracker } from './components/response-tracker';
export type { ResponseTrackerProps } from './components/response-tracker';
export { CompletionChart } from './components/completion-chart';
export type { CompletionChartProps } from './components/completion-chart';
export { RecalculateButton } from './components/recalculate-button';
export type { RecalculateButtonProps } from './components/recalculate-button';

export { useDeploymentManagement, deploymentKeys } from './hooks/use-deployment-management';
export type { UseDeploymentManagementOptions, UseDeploymentManagementResult } from './hooks/use-deployment-management';
export { useResponseTracking, responseTrackingKeys } from './hooks/use-response-tracking';
export type { UseResponseTrackingOptions } from './hooks/use-response-tracking';
export { useRealtimeResponses } from './hooks/use-realtime-responses';
export type { UseRealtimeResponsesOptions, UseRealtimeResponsesResult, ConnectionStatus } from './hooks/use-realtime-responses';

export {
  saveSurveyConfig,
  deploySurvey,
  getActiveDeployment,
  deactivateDeployment,
  getResponseMetrics,
  triggerScoreRecalculation,
  subscribeToResponses,
} from './services/deployment-service';
export type {
  SaveSurveyConfigParams,
  DeploySurveyParams,
  DailyCompletion,
  DepartmentBreakdown,
  ResponseMetrics,
} from './services/deployment-service';
