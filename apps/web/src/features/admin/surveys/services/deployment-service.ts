/** Re-export shim — implementation lives in `@compass/sdk`. */
export {
  saveSurveyConfig,
  publishSurvey,
  getActiveDeployment,
  unpublishSurvey,
  archiveSurvey,
  unarchiveSurvey,
  getResponseMetrics,
  triggerScoreRecalculation,
  subscribeToResponses,
} from '@compass/sdk';
export type {
  SaveSurveyConfigParams,
  PublishSurveyParams,
  DailyCompletion,
  DepartmentBreakdown,
  ResponseMetrics,
} from '@compass/sdk';
