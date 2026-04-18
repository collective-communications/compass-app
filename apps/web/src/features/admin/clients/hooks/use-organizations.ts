/**
 * TanStack Query hooks for fetching and mutating organizations.
 * Provides the data layer for the client list page.
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query';
import type { Organization, OrganizationSummary, CreateOrganizationParams } from '@compass/types';
import { STALE_TIMES } from '../../../../lib/query-config';
import { listOrganizations, createOrganization } from '../services/client-service';

/** Query key factory for organization queries */
export const organizationKeys = {
  all: ['admin', 'organizations'] as const,
  list: () => [...organizationKeys.all, 'list'] as const,
};

/**
 * Fetches all organizations with survey aggregation data.
 */
export function useOrganizations(): UseQueryResult<OrganizationSummary[]> {
  return useQuery({
    queryKey: organizationKeys.list(),
    queryFn: listOrganizations,
    staleTime: STALE_TIMES.fast,
  });
}

/**
 * Creates a new organization and invalidates the list cache on success.
 */
export function useCreateOrganization(): UseMutationResult<Organization, Error, CreateOrganizationParams> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createOrganization,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: organizationKeys.all });
    },
  });
}
