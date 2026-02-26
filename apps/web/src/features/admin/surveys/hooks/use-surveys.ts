/**
 * TanStack Query hook for fetching the admin survey list.
 * Supports optional status filtering via pill tabs.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { SurveyStatus } from '@compass/types';
import { listSurveys, type SurveyListItem } from '../services/admin-survey-service';

export interface UseSurveysOptions {
  organizationId: string;
  statusFilter?: SurveyStatus;
  enabled?: boolean;
}

/** Query key factory for survey list queries */
export const surveyListKeys = {
  all: ['admin', 'surveys'] as const,
  list: (orgId: string, status?: SurveyStatus) =>
    [...surveyListKeys.all, 'list', orgId, status ?? 'all'] as const,
};

/**
 * Fetches all surveys for an organization with optional status filtering.
 * Refetches when statusFilter changes.
 */
export function useSurveys({
  organizationId,
  statusFilter,
  enabled = true,
}: UseSurveysOptions): UseQueryResult<SurveyListItem[]> {
  return useQuery({
    queryKey: surveyListKeys.list(organizationId, statusFilter),
    queryFn: () => listSurveys(organizationId, statusFilter),
    enabled: enabled && !!organizationId,
  });
}
