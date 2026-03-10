/**
 * Lightweight read-only hook to check whether CC+C has enabled
 * results access for the current user's organization.
 *
 * This is the client-side complement to the route-level guard
 * in results/routes.tsx — it controls UI visibility (button state)
 * rather than navigation access.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';

export const clientAccessKeys = {
  all: ['client-access'] as const,
  org: (orgId: string) => [...clientAccessKeys.all, orgId] as const,
};

async function fetchClientAccessEnabled(orgId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('organization_settings')
    .select('client_access_enabled')
    .eq('organization_id', orgId)
    .single();

  if (error) return false;
  return data?.client_access_enabled ?? false;
}

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
    queryFn: () => fetchClientAccessEnabled(organizationId!),
    enabled: !!organizationId,
    staleTime: 60_000,
  });

  return query.data ?? false;
}
