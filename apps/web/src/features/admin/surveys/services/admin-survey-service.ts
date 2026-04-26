/**
 * Re-export shim — implementation lives in `@compass/sdk`.
 * Kept at this path so existing import sites and tests continue to work.
 */
export {
  listSurveys,
  getSurveyBuilderData,
  createSurvey,
  updateQuestion,
  reorderQuestions,
  updateSurveyStatus,
  listTemplates,
} from '@compass/sdk';
export type {
  SurveyListItem,
  SurveyBuilderData,
  CreateSurveyParams,
  UpdateQuestionParams,
  ReorderQuestionParams,
} from '@compass/sdk';
