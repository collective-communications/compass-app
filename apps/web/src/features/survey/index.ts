/**
 * Survey feature barrel export.
 * Public API surface for the survey flow feature.
 */

// Context
export { SurveyProvider, useSurveyContext } from './context/survey-context';
export type { SurveyContextValue, SurveyProviderProps } from './context/survey-context';

// Hooks
export { useDeployment } from './hooks/use-deployment';
export { useQuestions } from './hooks/use-questions';
export { useMetadataConfig } from './hooks/use-metadata-config';
export { useCreateResponse } from './hooks/use-create-response';
export { useResumeSession } from './hooks/use-resume-session';
export type { ResumeSessionResult } from './hooks/use-resume-session';
export { useSubmitResponse } from './hooks/use-submit-response';
export type { SubmitParams, UseSubmitResponseReturn } from './hooks/use-submit-response';
export { useAnswerAutosave } from './hooks/use-answer-autosave';
export { useSurveyKeyboard } from './hooks/use-survey-keyboard';

// Stores
export { useAnswerStore } from './stores/answer-store';

// Services
export { createSurveyEngineAdapter } from './services/survey-engine-adapter';

// Lib
export { SessionCookieManager } from './lib/session-cookie';

// Components
export { WelcomeScreen } from './components/welcome-screen';
export type { WelcomeScreenProps } from './components/welcome-screen';
export { MetadataForm } from './components/metadata-form';
export { QuestionScreen } from './components/question-screen';
export { LikertScale } from './components/likert-scale';
export { ProgressSquares } from './components/progress-squares';
export { QuestionNavButtons } from './components/question-nav-buttons';
export { OpenEndedScreen } from './components/open-ended-screen';
export type { OpenEndedScreenProps } from './components/open-ended-screen';
export { ThankYouScreen } from './components/thank-you-screen';
export type { ThankYouScreenProps } from './components/thank-you-screen';
export { WelcomeBackScreen } from './components/welcome-back-screen';
export type { WelcomeBackScreenProps } from './components/welcome-back-screen';
export { SaveProgressScreen } from './components/save-progress-screen';
export type { SaveProgressScreenProps } from './components/save-progress-screen';

// Edge states
export {
  InvalidTokenScreen,
  SurveyClosedScreen,
  SurveyNotOpenScreen,
  AlreadyCompletedScreen,
} from './components/edge-states';
