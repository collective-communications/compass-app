/**
 * TanStack Query hook for fetching response metrics.
 * Provides total responses, completion rate, department breakdown, and daily completions.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import {
  getResponseMetrics,
  type ResponseMetrics,
} from '../services/deployment-service';

/** Query key factory for response tracking queries */
export const responseTrackingKeys = {
  all: ['admin', 'responses'] as const,
  metrics: (surveyId: string) => [...responseTrackingKeys.all, 'metrics', surveyId] as const,
};

export interface UseResponseTrackingOptions {
  surveyId: string;
  enabled?: boolean;
}

/**
 * Fetches aggregated response metrics for a survey.
 * Includes total responses, completion rate, department breakdown, and daily completions.
 */
export function useResponseTracking({
  surveyId,
  enabled = true,
}: UseResponseTrackingOptions): UseQueryResult<ResponseMetrics> {
  return useQuery({
    queryKey: responseTrackingKeys.metrics(surveyId),
    queryFn: () => getResponseMetrics(surveyId),
    enabled: enabled && !!surveyId,
  });
}
