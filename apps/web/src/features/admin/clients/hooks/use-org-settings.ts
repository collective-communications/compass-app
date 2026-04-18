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
import type { Database } from '@compass/types';
import { supabase } from '../../../../lib/supabase';
import { logger } from '../../../../lib/logger';

type OrgSettingsRow = Database['public']['Tables']['organization_settings']['Row'];
type OrgSettingsUpdate = Database['public']['Tables']['organization_settings']['Update'];

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

/**
 * Narrows a `Json` column value to `MetadataListItem[]`.
 * The column is declared `Json` in the generated schema but is always written as
 * a metadata-list array by the admin UI. Falls back to [] for any non-array value.
 */
function toMetadataList(value: unknown): MetadataListItem[] {
  return Array.isArray(value) ? (value as MetadataListItem[]) : [];
}

/**
 * Map a generated `organization_settings` row to the domain-level `OrgSettings`.
 * Shared between `fetchOrgSettings` and `updateOrgSettings` to keep column
 * narrowing in one place.
 */
function toOrgSettings(row: OrgSettingsRow): OrgSettings {
  return {
    id: row.id,
    orgId: row.organization_id,
    metadata: {
      departments: toMetadataList(row.metadata_departments),
      roles: toMetadataList(row.metadata_roles),
      locations: toMetadataList(row.metadata_locations),
      tenureBands: toMetadataList(row.metadata_tenure_bands),
    },
    branding: {
      displayName: row.display_name ?? '',
      logoUrl: row.logo_url ?? null,
    },
    clientAccessEnabled: row.client_access_enabled ?? false,
    updatedAt: row.updated_at,
  };
}

async function fetchOrgSettings(orgId: string): Promise<OrgSettings> {
  const { data, error } = await supabase
    .from('organization_settings')
    .select('*')
    .eq('organization_id', orgId)
    .single();

  if (error) {
    logger.error({ err: error, fn: 'fetchOrgSettings', orgId }, 'Failed to fetch organization settings');
    throw new Error(`Failed to fetch organization settings: ${error.message}`);
  }

  return toOrgSettings(data);
}

/**
 * Shape of the auto-save payload — a subset of the generated `Update` type with
 * JSON metadata columns narrowed to their runtime array shape.
 */
export type OrgSettingsUpdatePayload = Partial<{
  metadata_departments: MetadataListItem[];
  metadata_roles: MetadataListItem[];
  metadata_locations: MetadataListItem[];
  metadata_tenure_bands: MetadataListItem[];
  display_name: string;
  logo_url: string | null;
  client_access_enabled: boolean;
}>;

async function updateOrgSettings(
  orgId: string,
  updates: OrgSettingsUpdatePayload,
): Promise<OrgSettings> {
  // The generated Update type widens metadata columns to Json; MetadataListItem[]
  // is a structural subtype but TS cannot prove it, so cast via OrgSettingsUpdate.
  const { data, error } = await supabase
    .from('organization_settings')
    .update(updates as OrgSettingsUpdate)
    .eq('organization_id', orgId)
    .select('*')
    .single();

  if (error) {
    logger.error({ err: error, fn: 'updateOrgSettings', orgId }, 'Failed to update organization settings');
    throw new Error(`Failed to update organization settings: ${error.message}`);
  }

  return toOrgSettings(data);
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

  const entries = Object.entries(METADATA_USAGE_COLUMNS) as Array<[MetadataCategory, string]>;

  const queryResults = await Promise.all(
    entries.map(([, column]) =>
      supabase
        .from('responses')
        .select(`${column}, deployment:deployments!inner(survey:surveys!inner(organization_id))`)
        .eq('deployments.surveys.organization_id', orgId)
        .not(column, 'is', null),
    ),
  );

  /**
   * Narrow guard: returns the value at `column` iff it's a non-empty string.
   * Supabase's typed client produces a `ParserError` pseudo-type when the
   * select string is built dynamically, so we cannot statically assert the
   * full row shape. We only ever read one column per row, so a guarded
   * property-access is both sufficient and type-safe.
   */
  function readStringColumn(row: unknown, column: string): string | null {
    if (row === null || typeof row !== 'object') return null;
    const value = (row as { [k: string]: unknown })[column];
    return typeof value === 'string' && value.length > 0 ? value : null;
  }

  for (let i = 0; i < entries.length; i++) {
    const [category, column] = entries[i] as [MetadataCategory, string];
    const { data, error } = queryResults[i]!;

    if (error) {
      logger.error(
        { err: error, fn: 'fetchMetadataUsage', orgId, category, column },
        'Failed to load metadata usage — skipping category',
      );
      continue;
    }

    const rows: unknown[] = Array.isArray(data) ? data : [];
    for (const row of rows) {
      const value = readStringColumn(row, column);
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

  const DB_CATEGORY_MAP: Record<MetadataCategory, keyof OrgSettingsUpdatePayload> = {
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
      debouncedMutate({ [DB_CATEGORY_MAP[category]]: items } as OrgSettingsUpdatePayload);
    },
    [queryClient, orgId, debouncedMutate],
  );

  const updateBranding = useCallback(
    (branding: Partial<OrgBranding>): void => {
      queryClient.setQueryData<OrgSettings>(
        orgSettingsKeys.detail(orgId),
        (prev) => prev ? { ...prev, branding: { ...prev.branding, ...branding } } : prev,
      );
      const dbUpdates: OrgSettingsUpdatePayload = {};
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
