/**
 * TanStack Query hook for fetching survey builder data.
 * Loads the survey, its questions (with dimension mappings), all dimensions,
 * and whether the survey has existing responses (which locks editing).
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { getSurveyBuilderData, type SurveyBuilderData } from '../services/admin-survey-service';

/** Query key factory for survey builder queries */
export const surveyBuilderKeys = {
  all: ['admin', 'survey-builder'] as const,
  detail: (surveyId: string) => [...surveyBuilderKeys.all, surveyId] as const,
};

export interface UseSurveyBuilderOptions {
  surveyId: string;
  enabled?: boolean;
}

/**
 * Fetches all data needed for the survey builder:
 * survey metadata, questions with dimensions, dimension list, and response status.
 */
export function useSurveyBuilder({
  surveyId,
  enabled = true,
}: UseSurveyBuilderOptions): UseQueryResult<SurveyBuilderData> {
  return useQuery({
    queryKey: surveyBuilderKeys.detail(surveyId),
    queryFn: () => getSurveyBuilderData(surveyId),
    enabled: enabled && !!surveyId,
  });
}
