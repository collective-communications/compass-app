/**
 * Survey engine domain types, constants, and service interface.
 * Maps to the Culture Compass survey framework: dimensions, questions,
 * deployments, responses, and scoring.
 *
 * DB columns are snake_case; TypeScript interfaces use camelCase.
 */

// ─── Enums (as const objects) ────────────────────────────────────────────────

/** Survey lifecycle status — maps to survey_status Postgres enum */
export const SurveyStatus = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  PAUSED: 'paused',
  CLOSED: 'closed',
  ARCHIVED: 'archived',
} as const;

export type SurveyStatus = (typeof SurveyStatus)[keyof typeof SurveyStatus];

/** Question response type — maps to question_type Postgres enum */
export const QuestionType = {
  LIKERT_4: 'likert_4',
  OPEN_TEXT: 'open_text',
} as const;

export type QuestionType = (typeof QuestionType)[keyof typeof QuestionType];

/** Survey distribution method — maps to deployment_type Postgres enum */
export const DeploymentType = {
  ANONYMOUS_LINK: 'anonymous_link',
  TRACKED_LINK: 'tracked_link',
  EMAIL_INVITE: 'email_invite',
  SSO_GATED: 'sso_gated',
} as const;

export type DeploymentType = (typeof DeploymentType)[keyof typeof DeploymentType];

/** Culture Compass dimension codes */
export const DimensionCode = {
  CORE: 'core',
  CLARITY: 'clarity',
  CONNECTION: 'connection',
  COLLABORATION: 'collaboration',
} as const;

export type DimensionCode = (typeof DimensionCode)[keyof typeof DimensionCode];

// ─── Likert Scale ────────────────────────────────────────────────────────────

/** Valid Likert scale response values (4-point, no neutral) */
export type LikertValue = 1 | 2 | 3 | 4;

/** 4-point Likert scale definition with numeric values and labels */
export const LIKERT_SCALE = [
  { value: 1 as const, label: 'Strongly Disagree' },
  { value: 2 as const, label: 'Disagree' },
  { value: 3 as const, label: 'Agree' },
  { value: 4 as const, label: 'Strongly Agree' },
] as const;

/** Likert value to label mapping */
export const LIKERT_LABELS: Record<LikertValue, string> = {
  1: 'Strongly Disagree',
  2: 'Disagree',
  3: 'Agree',
  4: 'Strongly Agree',
};

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Reverse-score a Likert value for negatively-worded questions.
 * Formula: 5 - value (maps 1↔4, 2↔3)
 */
export function reverseScore(value: LikertValue): LikertValue {
  return (5 - value) as LikertValue;
}

/**
 * Get the session cookie name for a deployment.
 * Used for anonymous save-and-resume without account linkage.
 */
export function getSessionCookieName(deploymentId: string): string {
  return `cc_session_${deploymentId}`;
}

// ─── Domain Interfaces ───────────────────────────────────────────────────────

/** Culture Compass dimension (core, clarity, connection, collaboration, system) */
export interface Dimension {
  id: string;
  code: DimensionCode;
  name: string;
  description: string | null;
  color: string;
  displayOrder: number;
  segmentStartAngle: number | null;
  segmentEndAngle: number | null;
  createdAt: string;
}

/** Survey settings stored as JSONB */
export interface SurveySettings {
  allowAnonymous: boolean;
  requireMetadata: boolean;
  showProgressBar: boolean;
  welcomeMessage: string | null;
  completionMessage: string | null;
}

/** Survey definition */
export interface Survey {
  id: string;
  organizationId: string;
  title: string;
  description: string | null;
  status: SurveyStatus;
  opensAt: string | null;
  closesAt: string | null;
  settings: SurveySettings | null;
  scoresCalculated: boolean;
  scoresCalculatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

/** Individual survey question */
export interface Question {
  id: string;
  surveyId: string;
  text: string;
  description: string | null;
  type: QuestionType;
  reverseScored: boolean;
  options: unknown | null;
  required: boolean;
  displayOrder: number;
  diagnosticFocus: string | null;
  recommendedAction: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Question-to-dimension mapping with weight */
export interface QuestionDimension {
  id: string;
  questionId: string;
  dimensionId: string;
  weight: number;
}

/** Question joined with its dimension mapping */
export interface QuestionWithDimension extends Question {
  dimension: QuestionDimension;
}

/** Deployment settings stored as JSONB */
export interface DeploymentSettings {
  maxResponses: number | null;
  recipientEmail: string | null;
  allowMultiple: boolean;
}

/** Survey deployment (distribution method) */
export interface Deployment {
  id: string;
  surveyId: string;
  type: DeploymentType;
  token: string;
  settings: DeploymentSettings | null;
  expiresAt: string | null;
  accessCount: number;
  lastAccessedAt: string | null;
  createdAt: string;
}

/** Respondent metadata — NOT personally identifying */
export interface RespondentMetadata {
  department: string;
  role: string;
  location: string;
  tenure: string;
}

/** Map of question ID to Likert value or open-text response */
export type AnswerMap = Record<string, LikertValue | string>;

/** Survey response — CRITICAL: no userId, anonymity is structural */
export interface SurveyResponse {
  id: string;
  surveyId: string;
  deploymentId: string | null;
  answers: AnswerMap;
  metadata: RespondentMetadata;
  completedAt: string | null;
  ipHash: string | null;
  userAgent: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Reusable survey template */
export interface SurveyTemplate {
  id: string;
  name: string;
  description: string | null;
  organizationId: string | null;
  questions: unknown;
  settings: SurveySettings | null;
  isSystem: boolean;
  isActive: boolean;
}

/** Per-organization metadata field configuration */
export interface MetadataConfig {
  departments: string[];
  roles: string[];
  locations: string[];
  tenures: string[];
}

/** Default metadata options used when organization has no custom config */
export const DEFAULT_METADATA_CONFIG: MetadataConfig = {
  departments: [],
  roles: [
    'Senior Leadership Team',
    'Director',
    'Manager',
    'Individual Contributor',
    'Contractor',
    'Other',
  ],
  locations: ['Onsite', 'Remote', 'Hybrid'],
  tenures: [
    'Less than 6 months',
    '6 months - 1 year',
    '1-3 years',
    '3-5 years',
    '5-10 years',
    'More than 10 years',
  ],
};

// ─── Deployment Resolution ───────────────────────────────────────────────────

/**
 * Discriminated union for deployment token resolution.
 * Represents the possible outcomes when a respondent accesses a survey link.
 */
export type DeploymentResolution =
  | { status: 'valid'; deployment: Deployment; survey: Survey }
  | { status: 'expired'; message: string }
  | { status: 'closed'; message: string }
  | { status: 'not_found'; message: string }
  | { status: 'already_completed'; message: string };

// ─── Survey Engine Config ────────────────────────────────────────────────────

/** Configuration for the survey engine runtime */
export interface SurveyEngineConfig {
  /** Minimum responses before segment data is visible */
  anonymityThreshold: number;
  /** Auto-save interval in milliseconds */
  autoSaveIntervalMs: number;
  /** Maximum time allowed for survey completion in milliseconds */
  maxSessionDurationMs: number;
}

/** Default survey engine configuration */
export const DEFAULT_SURVEY_ENGINE_CONFIG: SurveyEngineConfig = {
  anonymityThreshold: 5,
  autoSaveIntervalMs: 30_000,
  maxSessionDurationMs: 7_200_000, // 2 hours
};

// ─── Survey Engine Service Interface ─────────────────────────────────────────

/**
 * Survey engine service contract.
 * Implementations handle deployment resolution, question loading,
 * response persistence, and session management.
 */
export interface SurveyEngineService {
  /** Resolve a deployment token to survey context or an error state */
  resolveDeployment(token: string): Promise<DeploymentResolution>;

  /** Load all questions for a survey, joined with dimension mappings */
  getQuestions(surveyId: string): Promise<QuestionWithDimension[]>;

  /** Load metadata configuration for the survey's organization */
  getMetadataConfig(organizationId: string): Promise<MetadataConfig>;

  /** Save partial or complete response (auto-save and final submit) */
  saveResponse(
    response: Pick<SurveyResponse, 'surveyId' | 'deploymentId' | 'answers' | 'metadata'> & {
      responseId?: string;
    },
  ): Promise<{ responseId: string }>;

  /** Mark a response as completed */
  completeResponse(responseId: string): Promise<void>;

  /** Resume a previously saved response by session cookie */
  resumeResponse(deploymentId: string, sessionToken: string): Promise<SurveyResponse | null>;
}
