/**
 * TanStack Query hook for per-organization settings.
 * Provides metadata configuration, branding, and access control
 * with auto-save via 500ms debounce, mirroring use-system-settings.
 */

import { useRef, useState, useCallback } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import { organizationKeys } from './use-organizations';
import { supabase } from '../../../../lib/supabase';

export type SaveStatus = 'saved' | 'saving' | 'error';

export interface MetadataListItem {
  id: string;
  label: string;
  sortOrder: number;
}

export interface OrgMetadata {
  departments: MetadataListItem[];
  roles: MetadataListItem[];
  locations: MetadataListItem[];
  tenureBands: MetadataListItem[];
}

export type MetadataCategory = keyof OrgMetadata;

export interface OrgBranding {
  displayName: string;
  logoUrl: string | null;
}

export interface OrgSettings {
  id: string;
  orgId: string;
  metadata: OrgMetadata;
  branding: OrgBranding;
  clientAccessEnabled: boolean;
  updatedAt: string;
}

/** Query key factory for org settings */
export const orgSettingsKeys = {
  all: ['admin', 'org-settings'] as const,
  detail: (orgId: string) => [...orgSettingsKeys.all, orgId] as const,
  metadataUsage: (orgId: string) => [...orgSettingsKeys.all, orgId, 'metadata-usage'] as const,
};

/** Map of metadata category to DB column names on the responses table */
const METADATA_USAGE_COLUMNS: Record<MetadataCategory, string> = {
  departments: 'metadata_department',
  roles: 'metadata_role',
  locations: 'metadata_location',
  tenureBands: 'metadata_tenure',
};

async function fetchOrgSettings(orgId: string): Promise<OrgSettings> {
  const { data, error } = await supabase
    .from('organization_settings')
    .select('*')
    .eq('organization_id', orgId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch organization settings: ${error.message}`);
  }

  return {
    id: data.id,
    orgId: data.organization_id,
    metadata: {
      departments: data.metadata_departments ?? [],
      roles: data.metadata_roles ?? [],
      locations: data.metadata_locations ?? [],
      tenureBands: data.metadata_tenure_bands ?? [],
    },
    branding: {
      displayName: data.display_name ?? '',
      logoUrl: data.logo_url ?? null,
    },
    clientAccessEnabled: data.client_access_enabled ?? false,
    updatedAt: data.updated_at,
  };
}

async function updateOrgSettings(
  orgId: string,
  updates: Partial<{
    metadata_departments: MetadataListItem[];
    metadata_roles: MetadataListItem[];
    metadata_locations: MetadataListItem[];
    metadata_tenure_bands: MetadataListItem[];
    display_name: string;
    logo_url: string | null;
    client_access_enabled: boolean;
  }>,
): Promise<OrgSettings> {
  const { data, error } = await supabase
    .from('organization_settings')
    .update(updates)
    .eq('organization_id', orgId)
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to update organization settings: ${error.message}`);
  }

  return {
    id: data.id,
    orgId: data.organization_id,
    metadata: {
      departments: data.metadata_departments ?? [],
      roles: data.metadata_roles ?? [],
      locations: data.metadata_locations ?? [],
      tenureBands: data.metadata_tenure_bands ?? [],
    },
    branding: {
      displayName: data.display_name ?? '',
      logoUrl: data.logo_url ?? null,
    },
    clientAccessEnabled: data.client_access_enabled ?? false,
    updatedAt: data.updated_at,
  };
}

/**
 * Fetches metadata values that are currently referenced by active survey responses.
 * Returns a set of label strings per category that are "in use" and should warn before removal.
 */
async function fetchMetadataUsage(orgId: string): Promise<Record<MetadataCategory, Set<string>>> {
  const result: Record<MetadataCategory, Set<string>> = {
    departments: new Set(),
    roles: new Set(),
    locations: new Set(),
    tenureBands: new Set(),
  };

  for (const [category, column] of Object.entries(METADATA_USAGE_COLUMNS) as Array<[MetadataCategory, string]>) {
    const { data, error } = await supabase
      .from('responses')
      .select(`${column}, deployment:deployments!inner(survey:surveys!inner(organization_id))`)
      .eq('deployments.surveys.organization_id', orgId)
      .not(column, 'is', null);

    if (error) continue;

    for (const row of ((data ?? []) as unknown) as Record<string, unknown>[]) {
      const value = row[column] as string | null;
      if (value) {
        result[category].add(value);
      }
    }
  }

  return result;
}

export interface UseOrgSettingsReturn {
  query: UseQueryResult<OrgSettings>;
  settings: OrgSettings | undefined;
  metadataUsage: Record<MetadataCategory, Set<string>>;
  saveStatus: SaveStatus;
  updateMetadata: (category: MetadataCategory, items: MetadataListItem[]) => void;
  updateBranding: (branding: Partial<OrgBranding>) => void;
  updateClientAccess: (enabled: boolean) => void;
}

/**
 * Fetches per-organization settings and provides debounced auto-save.
 * Mirrors the auto-save pattern from useSystemSettings.
 */
export function useOrgSettings(orgId: string): UseOrgSettingsReturn {
  const queryClient = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');

  const query = useQuery({
    queryKey: orgSettingsKeys.detail(orgId),
    queryFn: () => fetchOrgSettings(orgId),
    enabled: !!orgId,
  });

  const usageQuery = useQuery({
    queryKey: orgSettingsKeys.metadataUsage(orgId),
    queryFn: () => fetchMetadataUsage(orgId),
    enabled: !!orgId,
  });

  const mutation = useMutation({
    mutationFn: (updates: Parameters<typeof updateOrgSettings>[1]) =>
      updateOrgSettings(orgId, updates),
    onMutate: () => {
      setSaveStatus('saving');
    },
    onSuccess: (data) => {
      queryClient.setQueryData(orgSettingsKeys.detail(orgId), data);
      setSaveStatus('saved');
    },
    onError: () => {
      setSaveStatus('error');
    },
  });

  const debouncedMutate = useCallback(
    (updates: Parameters<typeof updateOrgSettings>[1]): void => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        mutation.mutate(updates);
      }, 500);
    },
    [mutation],
  );

  const DB_CATEGORY_MAP: Record<MetadataCategory, string> = {
    departments: 'metadata_departments',
    roles: 'metadata_roles',
    locations: 'metadata_locations',
    tenureBands: 'metadata_tenure_bands',
  };

  const updateMetadata = useCallback(
    (category: MetadataCategory, items: MetadataListItem[]): void => {
      queryClient.setQueryData<OrgSettings>(
        orgSettingsKeys.detail(orgId),
        (prev) => prev ? { ...prev, metadata: { ...prev.metadata, [category]: items } } : prev,
      );
      debouncedMutate({ [DB_CATEGORY_MAP[category]]: items });
    },
    [queryClient, orgId, debouncedMutate],
  );

  const updateBranding = useCallback(
    (branding: Partial<OrgBranding>): void => {
      queryClient.setQueryData<OrgSettings>(
        orgSettingsKeys.detail(orgId),
        (prev) => prev ? { ...prev, branding: { ...prev.branding, ...branding } } : prev,
      );
      const dbUpdates: Record<string, unknown> = {};
      if (branding.displayName !== undefined) dbUpdates.display_name = branding.displayName;
      if (branding.logoUrl !== undefined) dbUpdates.logo_url = branding.logoUrl;
      debouncedMutate(dbUpdates);
    },
    [queryClient, orgId, debouncedMutate],
  );

  const updateClientAccess = useCallback(
    (enabled: boolean): void => {
      queryClient.setQueryData<OrgSettings>(
        orgSettingsKeys.detail(orgId),
        (prev) => prev ? { ...prev, clientAccessEnabled: enabled } : prev,
      );
      debouncedMutate({ client_access_enabled: enabled });
    },
    [queryClient, orgId, debouncedMutate],
  );

  return {
    query,
    settings: query.data,
    metadataUsage: usageQuery.data ?? {
      departments: new Set(),
      roles: new Set(),
      locations: new Set(),
      tenureBands: new Set(),
    },
    saveStatus,
    updateMetadata,
    updateBranding,
    updateClientAccess,
  };
}
