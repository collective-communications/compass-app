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
        .select('*')
        .eq('token', token)
        .single();

      if (deploymentError || !deployment) {
        return { status: 'not_found', message: 'This survey link is not valid.' };
      }

      const { data: survey, error: surveyError } = await supabase
        .from('surveys')
        .select('*')
        .eq('id', deployment.survey_id)
        .single();

      if (surveyError || !survey) {
        return { status: 'not_found', message: 'The survey associated with this link could not be found.' };
      }

      // Check if deployment has expired
      if (deployment.expires_at && new Date(deployment.expires_at) < new Date()) {
        return { status: 'expired', message: 'This survey link has expired.' };
      }

      // Check survey status
      if (survey.status === 'closed' || survey.status === 'archived') {
        return { status: 'closed', message: `This survey closed on ${formatDate(survey.closes_at)}.`, closesAt: survey.closes_at };
      }

      // Check if survey has not opened yet
      if (survey.opens_at && new Date(survey.opens_at) > new Date()) {
        return {
          status: 'not_yet_open',
          message: `This survey opens on ${formatDate(survey.opens_at)}.`,
          opensAt: survey.opens_at,
        };
      }

      // Map snake_case DB row to camelCase Deployment interface
      return {
        status: 'valid',
        deployment: mapDeployment(deployment),
        survey: mapSurvey(survey),
      };
    },

    async resumeResponse(
      deploymentId: string,
      sessionToken: string,
    ): Promise<SurveyResponse | null> {
      const { data, error } = await supabase
        .from('responses')
        .select('*')
        .eq('deployment_id', deploymentId)
        .eq('id', sessionToken)
        .maybeSingle();

      if (error || !data) {
        return null;
      }

      return mapResponse(data);
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
      },
    ): Promise<{ responseId: string }> {
      const row = {
        survey_id: params.surveyId,
        deployment_id: params.deploymentId,
        answers: params.answers,
        metadata: params.metadata,
        completed_at: null,
      };

      if (params.responseId) {
        const { error } = await supabase
          .from('responses')
          .update(row)
          .eq('id', params.responseId);

        if (error) {
          throw new Error(`Failed to update response: ${error.message}`);
        }

        return { responseId: params.responseId };
      }

      const { data, error } = await supabase
        .from('responses')
        .insert(row)
        .select('id')
        .single();

      if (error || !data) {
        throw new Error(`Failed to create response: ${error?.message ?? 'No data returned'}`);
      }

      return { responseId: data.id as string };
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

      return data.map((row: any) => {
        const qd = Array.isArray(row.question_dimensions)
          ? row.question_dimensions[0]
          : row.question_dimensions;

        return {
          id: row.id,
          surveyId: row.survey_id,
          text: row.text,
          description: row.description,
          type: row.type,
          reverseScored: row.reverse_scored,
          options: row.options,
          required: row.required,
          displayOrder: row.order_index,
          diagnosticFocus: row.diagnostic_focus,
          recommendedAction: row.recommended_action,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          dimension: qd
            ? {
                id: qd.id,
                questionId: qd.question_id,
                dimensionId: qd.dimension_id,
                weight: qd.weight,
              }
            : { id: '', questionId: row.id, dimensionId: '', weight: 1 },
        } satisfies QuestionWithDimension;
      });
    },

    async submitResponse(responseId: string): Promise<void> {
      const { error } = await supabase
        .from('responses')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', responseId)
        .is('completed_at', null);

      if (error) {
        throw new Error(`Failed to submit response: ${error.message}`);
      }
    },

    async upsertAnswer(
      responseId: string,
      questionId: string,
      value: LikertValue | string,
    ): Promise<void> {
      const { error } = await supabase.rpc('upsert_answer', {
        p_response_id: responseId,
        p_question_id: questionId,
        p_value: value,
      });

      if (error) {
        // Fallback: read-modify-write if RPC not available
        const { data: existing, error: readError } = await supabase
          .from('responses')
          .select('answers')
          .eq('id', responseId)
          .single();

        if (readError) {
          throw new Error(`Failed to read response for answer update: ${readError.message}`);
        }

        const updatedAnswers = { ...(existing?.answers as Record<string, unknown>), [questionId]: value };

        const { error: writeError } = await supabase
          .from('responses')
          .update({ answers: updatedAnswers })
          .eq('id', responseId);

        if (writeError) {
          throw new Error(`Failed to save answer: ${writeError.message}`);
        }
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

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Map a snake_case deployment row to the camelCase Deployment interface */
function mapDeployment(row: any): import('@compass/types').Deployment {
  return {
    id: row.id,
    surveyId: row.survey_id,
    type: row.type,
    token: row.token,
    settings: row.settings,
    expiresAt: row.expires_at,
    accessCount: row.access_count,
    lastAccessedAt: row.last_accessed_at,
    createdAt: row.created_at,
  };
}

/** Map a snake_case survey row to the camelCase Survey interface */
function mapSurvey(row: any): import('@compass/types').Survey {
  return {
    id: row.id,
    organizationId: row.organization_id,
    title: row.title,
    description: row.description,
    status: row.status,
    opensAt: row.opens_at,
    closesAt: row.closes_at,
    settings: row.settings,
    scoresCalculated: row.scores_calculated,
    scoresCalculatedAt: row.scores_calculated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
  };
}

/** Map a snake_case response row to the camelCase SurveyResponse interface */
function mapResponse(row: any): SurveyResponse {
  return {
    id: row.id,
    surveyId: row.survey_id,
    deploymentId: row.deployment_id,
    answers: row.answers,
    metadata: row.metadata,
    completedAt: row.completed_at,
    ipHash: row.ip_hash,
    userAgent: row.user_agent,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
