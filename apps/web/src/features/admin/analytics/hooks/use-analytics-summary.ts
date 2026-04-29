/**
 * TanStack Query hook for CC+C aggregate usage analytics.
 */
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { AnalyticsSummary } from '@compass/types';
import { STALE_TIMES } from '../../../../lib/query-config';
import {
  getAnalyticsSummary,
  type AnalyticsSummaryParams,
} from '../services/analytics-service';

export interface UseAnalyticsSummaryParams extends AnalyticsSummaryParams {
  enabled?: boolean;
}

export const analyticsKeys = {
  all: ['admin', 'analytics'] as const,
  summary: (params: AnalyticsSummaryParams = {}) => [
    ...analyticsKeys.all,
    'summary',
    params.startDate ?? 'default-start',
    params.endDate ?? 'default-end',
  ] as const,
};

/** Fetch aggregate-only usage analytics for the default reporting window. */
export function useAnalyticsSummary(
  params: UseAnalyticsSummaryParams = {},
): UseQueryResult<AnalyticsSummary> {
  const { enabled = true, startDate, endDate } = params;

  return useQuery({
    queryKey: analyticsKeys.summary({ startDate, endDate }),
    queryFn: () => getAnalyticsSummary({ startDate, endDate }),
    staleTime: STALE_TIMES.fast,
    enabled,
  });
}
