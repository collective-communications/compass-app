/**
 * Supabase implementation of the SurveyEngineService interface.
 * Handles deployment resolution and response resumption via session tokens.
 */
import type {
  Database,
  SurveyEngineService,
  DeploymentResolution,
  SurveyResponse,
  MetadataConfig,
  QuestionWithDimension,
  LikertValue,
} from '@compass/types';

type ResponseInsert = Database['public']['Tables']['responses']['Insert'];
type SurveyRow = Database['public']['Tables']['surveys']['Row'];
type DeploymentRow = Database['public']['Tables']['deployments']['Row'];
type QuestionRow = Database['public']['Tables']['questions']['Row'];
type AnswerRow = Database['public']['Tables']['answers']['Row'];
type ResponseRow = Database['public']['Tables']['responses']['Row'];

type QuestionRowWithDrift = QuestionRow & {
  description?: string | null;
  options?: unknown;
  diagnostic_focus?: string | null;
  recommended_action?: string | null;
  updated_at?: string;
};

type QuestionRowWithDimensions = QuestionRowWithDrift & {
  question_dimensions?: Array<{
    id?: string;
    question_id: string;
    dimension_id: string;
    weight?: number;
  }> | {
    id?: string;
    question_id: string;
    dimension_id: string;
    weight?: number;
  } | null;
};

type DeploymentWithSurveyRow = DeploymentRow & {
  survey: SurveyRow | null;
};

type ResponseWithAnswersRow = ResponseRow & {
  answers: Array<Pick<AnswerRow, 'question_id' | 'likert_value' | 'open_text_value'>>;
};

import { DEFAULT_METADATA_CONFIG } from '@compass/types';
import { formatDisplayDate } from '@compass/utils';
import { getClient, getSessionClient, getLogger } from '../runtime';
import { mapSurveyRow, mapDeploymentRow, mapQuestionRow } from '../lib/mappers';

/**
 * Create a partial SurveyEngineService backed by Supabase.
 * Covers deployment resolution and session-based response lookup.
 */
export function createSurveyEngineAdapter(): Pick<
  SurveyEngineService,
  'resolveDeployment' | 'resumeResponse' | 'getMetadataConfig' | 'saveResponse' | 'getQuestions'
> & {
  upsertAnswer: (responseId: string, questionId: string, value: LikertValue | string) => Promise<void>;
  submitResponse: (responseId: string) => Promise<void>;
} {
  return {
    async resolveDeployment(token: string): Promise<DeploymentResolution> {
      const supabase = getClient();
      const logger = getLogger();
      const { data: deployment, error: deploymentError } = await supabase
        .from('deployments')
        .select('*, survey:surveys(*)')
        .eq('token', token)
        .single();

      if (deploymentError || !deployment) {
        if (deploymentError) {
          logger.error(
            { err: deploymentError, fn: 'resolveDeployment', token },
            'Failed to resolve deployment token',
          );
        }
        return { status: 'not_found', message: 'This survey link is not valid.' };
      }

      const row = deployment as DeploymentWithSurveyRow;
      const survey = row.survey;

      if (!survey) {
        return { status: 'not_found', message: 'The survey associated with this link could not be found.' };
      }

      const surveyStatus = survey.status;
      const deploymentClosesAt = row.closes_at;
      const deploymentOpensAt = row.opens_at;

      if (surveyStatus === 'closed' || surveyStatus === 'archived') {
        const closesAt = deploymentClosesAt ?? survey.closes_at ?? null;
        return {
          status: 'closed',
          message: `This survey closed on ${formatDisplayDate(closesAt, 'long', { nullFallback: 'an unknown date' })}.`,
          closesAt,
        };
      }

      if (deploymentClosesAt && new Date(deploymentClosesAt) < new Date()) {
        return {
          status: 'expired',
          message: `This survey link expired on ${formatDisplayDate(deploymentClosesAt, 'long', { nullFallback: 'an unknown date' })}.`,
          closesAt: deploymentClosesAt,
        };
      }

      if (deploymentOpensAt && new Date(deploymentOpensAt) > new Date()) {
        return {
          status: 'not_yet_open',
          message: `This survey opens on ${formatDisplayDate(deploymentOpensAt, 'long', { nullFallback: 'an unknown date' })}.`,
          opensAt: deploymentOpensAt,
        };
      }

      return {
        status: 'valid',
        deployment: mapDeploymentRow(row),
        survey: mapSurveyRow(survey),
      };
    },

    async resumeResponse(
      deploymentId: string,
      sessionToken: string,
    ): Promise<SurveyResponse | null> {
      const logger = getLogger();
      const client = getSessionClient(sessionToken);
      const { data, error } = await client
        .from('responses')
        .select('*, answers(question_id, likert_value, open_text_value)')
        .eq('deployment_id', deploymentId)
        .eq('id', sessionToken)
        .maybeSingle();

      if (error) {
        logger.error(
          { err: error, fn: 'resumeResponse', deploymentId },
          'Failed to resume survey response',
        );
      }

      if (error || !data) {
        return null;
      }

      return mapResponseWithAnswers(data as ResponseWithAnswersRow);
    },

    async getMetadataConfig(organizationId: string): Promise<MetadataConfig> {
      const supabase = getClient();
      const logger = getLogger();
      const { data, error } = await supabase
        .from('organizations')
        .select('settings')
        .eq('id', organizationId)
        .single();

      if (error) {
        logger.error(
          { err: error, fn: 'getMetadataConfig', organizationId },
          'Failed to read organization settings — falling back to defaults',
        );
      }

      if (error || !data?.settings) {
        return { ...DEFAULT_METADATA_CONFIG };
      }

      const settings = data.settings as { metadataConfig?: Partial<MetadataConfig> };
      const orgConfig = settings?.metadataConfig;

      if (!orgConfig) {
        return { ...DEFAULT_METADATA_CONFIG };
      }

      return {
        departments: orgConfig.departments?.length
          ? orgConfig.departments
          : DEFAULT_METADATA_CONFIG.departments,
        roles: orgConfig.roles?.length
          ? orgConfig.roles
          : DEFAULT_METADATA_CONFIG.roles,
        locations: orgConfig.locations?.length
          ? orgConfig.locations
          : DEFAULT_METADATA_CONFIG.locations,
        tenures: orgConfig.tenures?.length
          ? orgConfig.tenures
          : DEFAULT_METADATA_CONFIG.tenures,
      };
    },

    async saveResponse(
      params: Pick<SurveyResponse, 'surveyId' | 'deploymentId' | 'answers' | 'metadata'> & {
        responseId?: string;
        sessionToken?: string;
      },
    ): Promise<{ responseId: string }> {
      const logger = getLogger();
      const metadataColumns = params.metadata
        ? {
            metadata_department: params.metadata.department ?? null,
            metadata_role: params.metadata.role ?? null,
            metadata_location: params.metadata.location ?? null,
            metadata_tenure: params.metadata.tenure ?? null,
          }
        : {};

      if (params.responseId) {
        const client = getSessionClient(params.responseId);
        const { error } = await client
          .from('responses')
          .update(metadataColumns)
          .eq('id', params.responseId);

        if (error) {
          logger.error(
            { err: error, fn: 'saveResponse.update', responseId: params.responseId },
            'Failed to update existing survey response',
          );
          throw new Error(`Failed to update response: ${error.message}`);
        }

        return { responseId: params.responseId };
      }

      const responseId = params.sessionToken || crypto.randomUUID();

      if (!params.deploymentId) {
        throw new Error('Cannot save response without a deployment ID.');
      }

      const row: ResponseInsert = {
        id: responseId,
        deployment_id: params.deploymentId,
        session_token: responseId,
        ...metadataColumns,
      };

      const supabase = getClient();
      const { error } = await supabase.from('responses').insert(row);

      if (error) {
        logger.error(
          { err: error, fn: 'saveResponse.insert', responseId, deploymentId: params.deploymentId },
          'Failed to create new survey response',
        );
        throw new Error(`Failed to create response: ${error.message}`);
      }

      return { responseId };
    },

    async getQuestions(surveyId: string): Promise<QuestionWithDimension[]> {
      const supabase = getClient();
      const logger = getLogger();
      const { data, error } = await supabase
        .from('questions')
        .select('*, question_dimensions(question_id, dimension_id, weight)')
        .eq('survey_id', surveyId)
        .order('order_index', { ascending: true });

      if (error) {
        logger.error(
          { err: error, fn: 'getQuestions', surveyId },
          'Failed to load survey questions',
        );
        throw new Error(`Failed to load questions: ${error.message}`);
      }

      if (!data || data.length === 0) {
        return [];
      }

      return (data as QuestionRowWithDimensions[]).map((row) => {
        const qdRaw = row.question_dimensions;
        const qd = Array.isArray(qdRaw) ? qdRaw[0] : qdRaw ?? undefined;

        const base = mapQuestionRow(row);
        return {
          ...base,
          dimension: qd
            ? {
                id: qd.id ?? '',
                questionId: qd.question_id,
                dimensionId: qd.dimension_id,
                weight: qd.weight ?? 1,
              }
            : { id: '', questionId: base.id, dimensionId: '', weight: 1 },
          subDimension: null,
        } satisfies QuestionWithDimension;
      });
    },

    async submitResponse(responseId: string): Promise<void> {
      const logger = getLogger();
      const client = getSessionClient(responseId);
      const { error } = await client
        .from('responses')
        .update({ is_complete: true, submitted_at: new Date().toISOString() })
        .eq('id', responseId)
        .eq('is_complete', false);

      if (error) {
        logger.error(
          { err: error, fn: 'submitResponse', responseId },
          'Failed to mark survey response as complete',
        );
        throw new Error(`Failed to submit response: ${error.message}`);
      }
    },

    async upsertAnswer(
      responseId: string,
      questionId: string,
      value: LikertValue | string,
    ): Promise<void> {
      const logger = getLogger();
      const isLikert = typeof value === 'number';

      const row = {
        response_id: responseId,
        question_id: questionId,
        ...(isLikert
          ? { likert_value: value, open_text_value: null }
          : { likert_value: null, open_text_value: value }),
      };

      const client = getSessionClient(responseId);
      const { error } = await client
        .from('answers')
        .upsert(row, { onConflict: 'response_id,question_id' });

      if (error) {
        logger.error(
          { err: error, fn: 'upsertAnswer', responseId, questionId },
          'Failed to upsert survey answer',
        );
        throw new Error(`Failed to save answer: ${error.message}`);
      }
    },
  };
}

function mapResponseWithAnswers(row: ResponseWithAnswersRow): SurveyResponse {
  const answers: Record<string, LikertValue | string> = {};

  for (const a of row.answers ?? []) {
    if (a.likert_value != null) {
      answers[a.question_id] = a.likert_value as LikertValue;
    } else if (a.open_text_value != null) {
      answers[a.question_id] = a.open_text_value;
    }
  }

  return {
    id: row.id,
    surveyId: '',
    deploymentId: row.deployment_id,
    answers,
    metadata: {
      department: row.metadata_department ?? '',
      role: row.metadata_role ?? '',
      location: row.metadata_location ?? '',
      tenure: row.metadata_tenure ?? '',
    },
    completedAt: row.submitted_at ?? null,
    ipHash: row.ip_hash ?? null,
    userAgent: null,
    createdAt: row.created_at,
    updatedAt: row.started_at,
  };
}
