/**
 * Lightweight read-only hook to check whether CC+C has enabled
 * results access for the current user's organization.
 *
 * This is the client-side complement to the route-level guard
 * `guardClientAccess` in `apps/web/src/lib/route-guards.ts` — it controls
 * UI visibility (button state) rather than navigation access. Both resolve
 * via `queryClientAccessEnabled` so the hook and the guard cannot disagree
 * about what `client_access_enabled` means.
 */

import { useQuery } from '@tanstack/react-query';
import { queryClientAccessEnabled } from '../../../lib/route-guards';
import { STALE_TIMES } from '../../../lib/query-config';

export { clientAccessKeys } from './client-access-keys';
import { clientAccessKeys } from './client-access-keys';

export interface UseClientAccessOptions {
  organizationId: string | null;
}

/**
 * Returns whether client results access is enabled for the given org.
 * Returns `true` for tier_1 users (CC+C admins always have access).
 */
export function useClientAccess({ organizationId }: UseClientAccessOptions): boolean {
  const query = useQuery({
    queryKey: clientAccessKeys.org(organizationId ?? ''),
    // `enabled` guards against the null case; the non-null assertion is safe.
    queryFn: () => queryClientAccessEnabled(organizationId as string),
    enabled: !!organizationId,
    staleTime: STALE_TIMES.default,
  });

  return query.data ?? false;
}
