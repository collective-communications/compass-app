/**
 * Supabase implementation of the SurveyEngineService interface.
 * Handles deployment resolution and response resumption via session tokens.
 */
import type {
  SurveyEngineService,
  DeploymentResolution,
  SurveyResponse,
  MetadataConfig,
  RespondentMetadata,
  QuestionWithDimension,
  LikertValue,
} from '@compass/types';
import { DEFAULT_METADATA_CONFIG } from '@compass/types';
import { supabase } from '../../../lib/supabase';
import { mapSurveyRow, mapDeploymentRow } from '../../../lib/mappers/survey-mappers';

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
      const { data: deployment, error: deploymentError } = await supabase
        .from('deployments')
        .select('*, survey:surveys(*)')
        .eq('token', token)
        .single();

      if (deploymentError || !deployment) {
        return { status: 'not_found', message: 'This survey link is not valid.' };
      }

      const survey = (deployment as Record<string, unknown>)['survey'] as Record<string, unknown> | null;

      if (!survey) {
        return { status: 'not_found', message: 'The survey associated with this link could not be found.' };
      }

      // Check if deployment has expired
      const expiresAt = (deployment as Record<string, unknown>)['expires_at'] as string | null;
      if (expiresAt && new Date(expiresAt) < new Date()) {
        return { status: 'expired', message: 'This survey link has expired.' };
      }

      // Check survey status
      const surveyStatus = survey['status'] as string;
      const closesAt = survey['closes_at'] as string | null;
      const opensAt = survey['opens_at'] as string | null;

      if (surveyStatus === 'closed' || surveyStatus === 'archived') {
        return { status: 'closed', message: `This survey closed on ${formatDate(closesAt)}.`, closesAt };
      }

      // Check if survey has not opened yet
      if (opensAt && new Date(opensAt) > new Date()) {
        return {
          status: 'not_yet_open',
          message: `This survey opens on ${formatDate(opensAt)}.`,
          opensAt,
        };
      }

      return {
        status: 'valid',
        deployment: mapDeploymentRow(deployment as Record<string, unknown>),
        survey: mapSurveyRow(survey),
      };
    },

    async resumeResponse(
      deploymentId: string,
      sessionToken: string,
    ): Promise<SurveyResponse | null> {
      const { data, error } = await supabase
        .from('responses')
        .select('*, answers(question_id, likert_value, open_text_value)')
        .eq('deployment_id', deploymentId)
        .eq('id', sessionToken)
        .maybeSingle();

      if (error || !data) {
        return null;
      }

      return mapResponseWithAnswers(data as Record<string, unknown>);
    },

    async getMetadataConfig(organizationId: string): Promise<MetadataConfig> {
      const { data, error } = await supabase
        .from('organizations')
        .select('settings')
        .eq('id', organizationId)
        .single();

      if (error || !data?.settings) {
        return { ...DEFAULT_METADATA_CONFIG };
      }

      const orgConfig = (data.settings as Record<string, unknown>).metadataConfig as
        | Partial<MetadataConfig>
        | undefined;

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
      const metadataColumns = params.metadata
        ? {
            metadata_department: params.metadata.department ?? null,
            metadata_role: params.metadata.role ?? null,
            metadata_location: params.metadata.location ?? null,
            metadata_tenure: params.metadata.tenure ?? null,
          }
        : {};

      if (params.responseId) {
        const { error } = await supabase
          .from('responses')
          .update(metadataColumns)
          .eq('id', params.responseId);

        if (error) {
          throw new Error(`Failed to update response: ${error.message}`);
        }

        return { responseId: params.responseId };
      }

      // Use the session token as the response ID so that
      // sessionToken === responseId throughout the survey flow.
      const responseId = params.sessionToken || crypto.randomUUID();

      const row = {
        id: responseId,
        deployment_id: params.deploymentId,
        session_token: responseId,
        ...metadataColumns,
      };

      const { error } = await supabase.from('responses').insert(row);

      if (error) {
        throw new Error(`Failed to create response: ${error.message}`);
      }

      return { responseId };
    },

    async getQuestions(surveyId: string): Promise<QuestionWithDimension[]> {
      const { data, error } = await supabase
        .from('questions')
        .select('*, question_dimensions(question_id, dimension_id, weight)')
        .eq('survey_id', surveyId)
        .order('order_index', { ascending: true });

      if (error) {
        throw new Error(`Failed to load questions: ${error.message}`);
      }

      if (!data || data.length === 0) {
        return [];
      }

      return data.map((row: Record<string, unknown>) => {
        const qdRaw = row['question_dimensions'];
        const qd = Array.isArray(qdRaw)
          ? (qdRaw[0] as Record<string, unknown> | undefined)
          : (qdRaw as Record<string, unknown> | undefined);

        return {
          id: row['id'] as string,
          surveyId: row['survey_id'] as string,
          text: row['text'] as string,
          description: (row['description'] as string) ?? null,
          type: row['type'] as QuestionWithDimension['type'],
          reverseScored: (row['reverse_scored'] as boolean) ?? false,
          options: row['options'] ?? null,
          required: (row['required'] as boolean) ?? true,
          displayOrder: row['order_index'] as number,
          diagnosticFocus: (row['diagnostic_focus'] as string) ?? null,
          recommendedAction: (row['recommended_action'] as string) ?? null,
          createdAt: row['created_at'] as string,
          updatedAt: row['updated_at'] as string,
          subDimensionId: (row['sub_dimension_id'] as string) ?? null,
          dimension: qd
            ? {
                id: (qd['id'] as string) ?? '',
                questionId: qd['question_id'] as string,
                dimensionId: qd['dimension_id'] as string,
                weight: (qd['weight'] as number) ?? 1,
              }
            : { id: '', questionId: row['id'] as string, dimensionId: '', weight: 1 },
          subDimension: null,
        } satisfies QuestionWithDimension;
      });
    },

    async submitResponse(responseId: string): Promise<void> {
      const { error } = await supabase
        .from('responses')
        .update({ is_complete: true, submitted_at: new Date().toISOString() })
        .eq('id', responseId)
        .eq('is_complete', false);

      if (error) {
        throw new Error(`Failed to submit response: ${error.message}`);
      }
    },

    async upsertAnswer(
      responseId: string,
      questionId: string,
      value: LikertValue | string,
    ): Promise<void> {
      const isLikert = typeof value === 'number';

      const row = {
        response_id: responseId,
        question_id: questionId,
        ...(isLikert
          ? { likert_value: value, open_text_value: null }
          : { likert_value: null, open_text_value: value }),
      };

      const { error } = await supabase
        .from('answers')
        .upsert(row, { onConflict: 'response_id,question_id' });

      if (error) {
        throw new Error(`Failed to save answer: ${error.message}`);
      }
    },
  };
}

/** Format a date string for display in edge state messages */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'an unknown date';
  return new Date(dateStr).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** Map response row with joined answers from the answers table */
function mapResponseWithAnswers(row: Record<string, unknown>): SurveyResponse {
  // Build answers map from the joined answers rows
  const rawAnswers = row['answers'];
  const answersArray = Array.isArray(rawAnswers) ? rawAnswers as Array<Record<string, unknown>> : [];
  const answers: Record<string, LikertValue | string> = {};

  for (const a of answersArray) {
    if (a['likert_value'] != null) {
      answers[a['question_id'] as string] = a['likert_value'] as LikertValue;
    } else if (a['open_text_value'] != null) {
      answers[a['question_id'] as string] = a['open_text_value'] as string;
    }
  }

  return {
    id: row['id'] as string,
    surveyId: row['survey_id'] as string,
    deploymentId: row['deployment_id'] as string,
    answers,
    metadata: row['metadata'] as SurveyResponse['metadata'],
    completedAt: (row['completed_at'] as string) ?? null,
    ipHash: (row['ip_hash'] as string) ?? null,
    userAgent: (row['user_agent'] as string) ?? null,
    createdAt: row['created_at'] as string,
    updatedAt: row['updated_at'] as string,
  };
}
