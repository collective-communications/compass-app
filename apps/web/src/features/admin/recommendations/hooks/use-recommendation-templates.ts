/**
 * TanStack Query hook for recommendation template CRUD operations.
 * Manages all rows in `recommendation_templates`, ordered by dimension, severity, priority.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../../lib/supabase';
import { logger } from '../../../../lib/logger';

export interface RecommendationTemplate {
  id: string;
  dimensionCode: 'core' | 'clarity' | 'connection' | 'collaboration';
  severity: 'critical' | 'high' | 'medium' | 'healthy';
  priority: number;
  title: string;
  body: string;
  actions: string[];
  trustLadderLink: string | null;
  cccServiceLink: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

type TemplateInput = Omit<RecommendationTemplate, 'id' | 'createdAt' | 'updatedAt'>;
type TemplatePatch = Partial<TemplateInput>;

type TemplateRow = {
  dimension_code: string;
  severity: string;
  priority: number;
  title: string;
  body: string;
  actions: string[];
  trust_ladder_link: string | null;
  ccc_service_link: string | null;
  is_active: boolean;
};

export interface UseRecommendationTemplatesReturn {
  templates: RecommendationTemplate[];
  isLoading: boolean;
  createTemplate: (input: TemplateInput) => void;
  updateTemplate: (id: string, patch: TemplatePatch) => void;
  deleteTemplate: (id: string) => void;
  isSaving: boolean;
}

const QUERY_KEY = ['admin', 'recommendation-templates'] as const;

function toRow(input: TemplateInput): TemplateRow {
  return {
    dimension_code: input.dimensionCode,
    severity: input.severity,
    priority: input.priority,
    title: input.title,
    body: input.body,
    actions: input.actions,
    trust_ladder_link: input.trustLadderLink ?? null,
    ccc_service_link: input.cccServiceLink ?? null,
    is_active: input.isActive,
  };
}

function fromRow(row: {
  id: string;
  dimension_code: string;
  severity: string;
  priority: number;
  title: string;
  body: string;
  actions: unknown;
  trust_ladder_link: string | null;
  ccc_service_link: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}): RecommendationTemplate {
  return {
    id: row.id,
    dimensionCode: row.dimension_code as RecommendationTemplate['dimensionCode'],
    severity: row.severity as RecommendationTemplate['severity'],
    priority: row.priority,
    title: row.title,
    body: row.body,
    actions: Array.isArray(row.actions) ? (row.actions as string[]) : [],
    trustLadderLink: row.trust_ladder_link,
    cccServiceLink: row.ccc_service_link,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function fetchTemplates(): Promise<RecommendationTemplate[]> {
  const { data, error } = await supabase
    .from('recommendation_templates')
    .select('*')
    .order('dimension_code')
    .order('severity')
    .order('priority');

  if (error) {
    logger.error({ err: error, fn: 'fetchTemplates' }, 'Failed to fetch recommendation templates');
    throw new Error(`Failed to fetch recommendation templates: ${error.message}`);
  }

  return (data ?? []).map(fromRow);
}

async function insertTemplate(input: TemplateInput): Promise<RecommendationTemplate> {
  const { data, error } = await supabase
    .from('recommendation_templates')
    .insert(toRow(input))
    .select('*')
    .single();

  if (error) {
    logger.error({ err: error, fn: 'insertTemplate' }, 'Failed to create recommendation template');
    throw new Error(`Failed to create recommendation template: ${error.message}`);
  }

  return fromRow(data);
}

async function patchTemplate(id: string, patch: TemplatePatch): Promise<RecommendationTemplate> {
  const row: Partial<TemplateRow> = {};
  if (patch.dimensionCode !== undefined) row['dimension_code'] = patch.dimensionCode;
  if (patch.severity !== undefined) row['severity'] = patch.severity;
  if (patch.priority !== undefined) row['priority'] = patch.priority;
  if (patch.title !== undefined) row['title'] = patch.title;
  if (patch.body !== undefined) row['body'] = patch.body;
  if (patch.actions !== undefined) row['actions'] = patch.actions;
  if (patch.trustLadderLink !== undefined) row['trust_ladder_link'] = patch.trustLadderLink;
  if (patch.cccServiceLink !== undefined) row['ccc_service_link'] = patch.cccServiceLink;
  if (patch.isActive !== undefined) row['is_active'] = patch.isActive;

  const { data, error } = await supabase
    .from('recommendation_templates')
    .update(row)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    logger.error({ err: error, fn: 'patchTemplate', id }, 'Failed to update recommendation template');
    throw new Error(`Failed to update recommendation template: ${error.message}`);
  }

  return fromRow(data);
}

async function removeTemplate(id: string): Promise<void> {
  const { error } = await supabase
    .from('recommendation_templates')
    .delete()
    .eq('id', id);

  if (error) {
    logger.error({ err: error, fn: 'removeTemplate', id }, 'Failed to delete recommendation template');
    throw new Error(`Failed to delete recommendation template: ${error.message}`);
  }
}

export function useRecommendationTemplates(): UseRecommendationTemplatesReturn {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchTemplates,
  });

  const createMutation = useMutation({
    mutationFn: insertTemplate,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: TemplatePatch }) =>
      patchTemplate(id, patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: removeTemplate,
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous = queryClient.getQueryData<RecommendationTemplate[]>(QUERY_KEY);
      queryClient.setQueryData<RecommendationTemplate[]>(QUERY_KEY, (prev) =>
        prev ? prev.filter((t) => t.id !== id) : prev,
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(QUERY_KEY, context.previous);
      }
    },
  });

  return {
    templates: query.data ?? [],
    isLoading: query.isLoading,
    createTemplate: (input) => createMutation.mutate(input),
    updateTemplate: (id, patch) => updateMutation.mutate({ id, patch }),
    deleteTemplate: (id) => deleteMutation.mutate(id),
    isSaving:
      createMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending,
  };
}
