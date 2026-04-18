/**
 * TanStack Query hook for resolving a deployment token.
 * Wraps the survey engine adapter's resolveDeployment method.
 */
import { useQuery } from '@tanstack/react-query';
import type { DeploymentResolution } from '@compass/types';
import { STALE_TIMES } from '../../../lib/query-config';
import { createSurveyEngineAdapter } from '../services/survey-engine-adapter';

const adapter = createSurveyEngineAdapter();

/** Resolve a deployment token to its survey context or an edge state. */
export function useDeployment(token: string | undefined) {
  return useQuery<DeploymentResolution>({
    queryKey: ['deployment', token],
    queryFn: () => {
      if (!token) {
        return Promise.resolve({
          status: 'not_found' as const,
          message: 'No survey token provided.',
        });
      }
      return adapter.resolveDeployment(token);
    },
    enabled: !!token,
    staleTime: STALE_TIMES.results,
    retry: 2,
  });
}
