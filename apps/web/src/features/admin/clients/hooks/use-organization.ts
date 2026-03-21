/**
 * TanStack Query hook for fetching and mutating a single organization.
 * Provides data layer for the client detail page.
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query';
import type { OrganizationSummary } from '@compass/types';
import { organizationKeys } from './use-organizations';
import { supabase } from '../../../../lib/supabase';

/** Admin note attached to an organization, visible only to CC+C team */
export interface AdminNote {
  id: string;
  orgId: string;
  authorName: string;
  content: string;
  createdAt: string;
  archivedAt: string | null;
}

/** Parameters for updating an organization */
export interface UpdateOrganizationParams {
  name: string;
  industry?: string;
  employeeCount?: number;
  primaryContactName?: string;
  primaryContactEmail?: string;
}

/** Assigned consultant for an organization */
export interface AssignedConsultant {
  id: string;
  name: string;
  assignedAt: string;
}

/** Extends organizationKeys with detail-level query keys */
const detailKeys = {
  detail: (orgId: string) => [...organizationKeys.all, 'detail', orgId] as const,
  notes: (orgId: string) => [...organizationKeys.all, 'notes', orgId] as const,
  consultant: (orgId: string) => [...organizationKeys.all, 'consultant', orgId] as const,
};

/**
 * Fetches a single organization by ID with aggregated survey data.
 */
async function fetchOrganization(orgId: string): Promise<OrganizationSummary> {
  const { data, error } = await supabase
    .from('organizations')
    .select(`
      *,
      surveys:surveys(
        id,
        title,
        status,
        closes_at
      )
    `)
    .eq('id', orgId)
    .single();

  if (error) throw error;

  const surveys = (data.surveys ?? []) as Array<{
    id: string;
    title: string;
    status: string;
    closes_at: string | null;
  }>;

  const activeSurvey = surveys.find((s) => s.status === 'active') ?? null;
  let daysRemaining: number | null = null;

  if (activeSurvey?.closes_at) {
    const diffMs = new Date(activeSurvey.closes_at).getTime() - Date.now();
    daysRemaining = diffMs > 0 ? Math.ceil(diffMs / (1000 * 60 * 60 * 24)) : 0;
  }

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    industry: data.industry,
    employeeCount: data.employee_count,
    logoUrl: data.logo_url,
    primaryContactName: data.primary_contact_name,
    primaryContactEmail: data.primary_contact_email,
    createdAt: data.created_at,
    totalSurveys: surveys.length,
    activeSurveyId: activeSurvey?.id ?? null,
    activeSurveyTitle: activeSurvey?.title ?? null,
    responseCount: null,
    completionRate: null,
    daysRemaining,
    lastScore: null,
    scoreTrend: null,
    assignedConsultant: null,
  } satisfies OrganizationSummary;
}

/** Fetches admin notes for an organization */
async function fetchNotes(orgId: string): Promise<AdminNote[]> {
  const { data, error } = await supabase
    .from('admin_notes')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    orgId: row.organization_id,
    authorName: row.author_name,
    content: row.content,
    createdAt: row.created_at,
    archivedAt: row.archived_at ?? null,
  }));
}

/** Fetches assigned consultant for an organization */
async function fetchConsultant(orgId: string): Promise<AssignedConsultant | null> {
  const { data, error } = await supabase
    .from('organization_consultants')
    .select('id, consultant_name, assigned_at')
    .eq('organization_id', orgId)
    .order('assigned_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    name: data.consultant_name,
    assignedAt: data.assigned_at,
  };
}

/**
 * Fetches a single organization with survey aggregation data.
 */
export function useOrganization(orgId: string): UseQueryResult<OrganizationSummary> {
  return useQuery({
    queryKey: detailKeys.detail(orgId),
    queryFn: () => fetchOrganization(orgId),
    enabled: !!orgId,
  });
}

/** Fetches admin notes for an organization */
export function useAdminNotes(orgId: string): UseQueryResult<AdminNote[]> {
  return useQuery({
    queryKey: detailKeys.notes(orgId),
    queryFn: () => fetchNotes(orgId),
    enabled: !!orgId,
  });
}

/** Fetches assigned consultant for an organization */
export function useConsultant(orgId: string): UseQueryResult<AssignedConsultant | null> {
  return useQuery({
    queryKey: detailKeys.consultant(orgId),
    queryFn: () => fetchConsultant(orgId),
    enabled: !!orgId,
  });
}

/** Mutation to update organization details */
export function useUpdateOrganization(orgId: string): UseMutationResult<void, Error, UpdateOrganizationParams> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UpdateOrganizationParams): Promise<void> => {
      const { error } = await supabase
        .from('organizations')
        .update({
          name: params.name,
          industry: params.industry ?? null,
          employee_count: params.employeeCount ?? null,
          primary_contact_name: params.primaryContactName ?? null,
          primary_contact_email: params.primaryContactEmail ?? null,
        })
        .eq('id', orgId);

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: organizationKeys.all });
    },
  });
}

/** Mutation to add an admin note */
export function useAddNote(orgId: string): UseMutationResult<AdminNote, Error, { content: string; authorName: string }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params): Promise<AdminNote> => {
      const { data, error } = await supabase
        .from('admin_notes')
        .insert({
          organization_id: orgId,
          author_name: params.authorName,
          content: params.content,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        orgId: data.organization_id,
        authorName: data.author_name,
        content: data.content,
        createdAt: data.created_at,
        archivedAt: data.archived_at ?? null,
      };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: detailKeys.notes(orgId) });
    },
  });
}

/** Mutation to archive an organization (soft delete) */
export function useArchiveOrganization(orgId: string): UseMutationResult<void, Error, void> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<void> => {
      const { error } = await supabase
        .from('organizations')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', orgId);

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: organizationKeys.all });
    },
  });
}

/** Mutation to unarchive an organization */
export function useUnarchiveOrganization(orgId: string): UseMutationResult<void, Error, void> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<void> => {
      const { error } = await supabase
        .from('organizations')
        .update({ archived_at: null })
        .eq('id', orgId);

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: organizationKeys.all });
    },
  });
}

/** Mutation to archive an admin note (soft delete) */
export function useArchiveNote(orgId: string): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (noteId: string): Promise<void> => {
      const { error } = await supabase
        .from('admin_notes')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', noteId);

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: detailKeys.notes(orgId) });
    },
  });
}

/** Mutation to unarchive an admin note */
export function useUnarchiveNote(orgId: string): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (noteId: string): Promise<void> => {
      const { error } = await supabase
        .from('admin_notes')
        .update({ archived_at: null })
        .eq('id', noteId);

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: detailKeys.notes(orgId) });
    },
  });
}
