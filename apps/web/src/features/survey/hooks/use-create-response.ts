/**
 * TanStack Query mutation hook for creating a new survey response record.
 * Called when the respondent submits the metadata form on the welcome screen.
 */
import { useMutation } from '@tanstack/react-query';
import type { RespondentMetadata } from '@compass/types';
import { createSurveyEngineAdapter } from '../services/survey-engine-adapter';

const adapter = createSurveyEngineAdapter();

export interface CreateResponseParams {
  surveyId: string;
  deploymentId: string;
  metadata: RespondentMetadata;
}

/** Create a new response record with metadata and empty answers. */
export function useCreateResponse() {
  return useMutation({
    mutationFn: (params: CreateResponseParams) =>
      adapter.saveResponse({
        surveyId: params.surveyId,
        deploymentId: params.deploymentId,
        answers: {},
        metadata: params.metadata,
      }),
  });
}
