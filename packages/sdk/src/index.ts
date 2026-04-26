/**
 * @compass/sdk — headless TypeScript SDK for the Culture Compass backend.
 *
 * Call {@link configureSdk} once at startup with your Supabase client (and
 * optionally a `surveySessionClient` factory + `Logger`), then use the
 * exported service functions to drive the platform end-to-end.
 */

export { configureSdk, resetSdk } from './runtime';
export type { Logger, SdkConfig } from './runtime';

// Mappers — useful for callers that need to map joined row shapes themselves.
export {
  mapSurveyRow,
  mapQuestionRow,
  mapDimensionRow,
  mapSubDimensionRow,
  mapDeploymentRow,
} from './lib/mappers';

// Admin: surveys
export {
  listSurveys,
  getSurveyBuilderData,
  createSurvey,
  updateQuestion,
  reorderQuestions,
  updateSurveyStatus,
  listTemplates,
} from './admin/surveys';
export type {
  SurveyListItem,
  SurveyBuilderData,
  CreateSurveyParams,
  UpdateQuestionParams,
  ReorderQuestionParams,
} from './admin/surveys';

// Admin: deployments
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
} from './admin/deployments';
export type {
  SaveSurveyConfigParams,
  PublishSurveyParams,
  DailyCompletion,
  DepartmentBreakdown,
  ResponseMetrics,
} from './admin/deployments';

// Admin: recipients
export {
  listRecipients,
  addRecipients,
  removeRecipient,
  getRecipientStats,
  sendInvitations,
} from './admin/recipients';
export type { AddRecipientInput, RecipientStats } from './admin/recipients';

// Admin: clients (organizations)
export { listOrganizations, createOrganization } from './admin/clients';

// Admin: users
export {
  listTeamMembers,
  listClientUsers,
  listInvitations,
  createInvitation,
  resendInvitation,
  revokeInvitation,
  updateUserRole,
  removeUser,
} from './admin/users';
export type {
  CccRole,
  ClientRole,
  TeamMember,
  Invitation,
  InviteParams,
  UpdateRoleParams,
} from './admin/users';

// Survey respondent engine
export { createSurveyEngineAdapter } from './survey/engine';

// Reports
export {
  getReportStatus,
  listReports,
  createReport,
  triggerReportGeneration,
  deleteReport,
  getReportDownloadUrl,
} from './reports/api';
export type { ReportRow } from './reports/api';
export { assembleReportPayload } from './reports/assembler';
