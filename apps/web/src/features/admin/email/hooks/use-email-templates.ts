/**
 * TanStack Query hook for email template CRUD operations.
 * Manages system-default templates (org_id = NULL) and per-org overrides.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../../lib/supabase';
import { logger } from '../../../../lib/logger';

export type TemplateType = 'survey_invitation' | 'reminder' | 'report_ready';

export interface EmailTemplate {
  id: string;
  orgId: string | null;
  templateType: TemplateType;
  subject: string;
  htmlBody: string;
  createdAt: string;
  updatedAt: string;
}

export interface TemplatePatch {
  subject: string;
  htmlBody: string;
}

export interface UseEmailTemplatesReturn {
  templates: EmailTemplate[];
  isLoading: boolean;
  updateSystemTemplate: (templateType: TemplateType, patch: TemplatePatch) => void;
  upsertOrgOverride: (orgId: string, templateType: TemplateType, patch: TemplatePatch) => void;
  deleteOrgOverride: (orgId: string, templateType: TemplateType) => void;
  isSaving: boolean;
}

const QUERY_KEY = ['admin', 'email-templates'] as const;

function fromRow(row: {
  id: string;
  org_id: string | null;
  template_type: string;
  subject: string;
  html_body: string;
  created_at: string;
  updated_at: string;
}): EmailTemplate {
  return {
    id: row.id,
    orgId: row.org_id,
    templateType: row.template_type as TemplateType,
    subject: row.subject,
    htmlBody: row.html_body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function fetchTemplates(): Promise<EmailTemplate[]> {
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .order('template_type')
    .order('org_id', { nullsFirst: true });

  if (error) {
    logger.error({ err: error, fn: 'fetchTemplates' }, 'Failed to fetch email templates');
    throw new Error(`Failed to fetch email templates: ${error.message}`);
  }

  return (data ?? []).map(fromRow);
}

async function updateSystem(
  templateType: TemplateType,
  patch: TemplatePatch,
  existing: EmailTemplate | undefined,
): Promise<EmailTemplate> {
  if (existing) {
    const { data, error } = await supabase
      .from('email_templates')
      .update({ subject: patch.subject, html_body: patch.htmlBody })
      .eq('id', existing.id)
      .select('*')
      .single();

    if (error) {
      logger.error({ err: error, fn: 'updateSystem', templateType }, 'Failed to update system template');
      throw new Error(`Failed to update system template: ${error.message}`);
    }
    return fromRow(data);
  }

  const { data, error } = await supabase
    .from('email_templates')
    .insert({ org_id: null, template_type: templateType, subject: patch.subject, html_body: patch.htmlBody })
    .select('*')
    .single();

  if (error) {
    logger.error({ err: error, fn: 'updateSystem', templateType }, 'Failed to insert system template');
    throw new Error(`Failed to insert system template: ${error.message}`);
  }
  return fromRow(data);
}

async function upsertOrg(
  orgId: string,
  templateType: TemplateType,
  patch: TemplatePatch,
  existing: EmailTemplate | undefined,
): Promise<EmailTemplate> {
  if (existing) {
    const { data, error } = await supabase
      .from('email_templates')
      .update({ subject: patch.subject, html_body: patch.htmlBody })
      .eq('id', existing.id)
      .select('*')
      .single();

    if (error) {
      logger.error({ err: error, fn: 'upsertOrg', orgId, templateType }, 'Failed to update org template');
      throw new Error(`Failed to update org template: ${error.message}`);
    }
    return fromRow(data);
  }

  const { data, error } = await supabase
    .from('email_templates')
    .insert({ org_id: orgId, template_type: templateType, subject: patch.subject, html_body: patch.htmlBody })
    .select('*')
    .single();

  if (error) {
    logger.error({ err: error, fn: 'upsertOrg', orgId, templateType }, 'Failed to insert org template');
    throw new Error(`Failed to insert org template: ${error.message}`);
  }
  return fromRow(data);
}

async function deleteOrg(id: string): Promise<void> {
  const { error } = await supabase.from('email_templates').delete().eq('id', id);

  if (error) {
    logger.error({ err: error, fn: 'deleteOrg', id }, 'Failed to delete org template override');
    throw new Error(`Failed to delete org template override: ${error.message}`);
  }
}

export function useEmailTemplates(): UseEmailTemplatesReturn {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchTemplates,
  });

  const systemMutation = useMutation({
    mutationFn: ({ templateType, patch }: { templateType: TemplateType; patch: TemplatePatch }) => {
      const existing = (queryClient.getQueryData<EmailTemplate[]>(QUERY_KEY) ?? []).find(
        (t) => t.orgId === null && t.templateType === templateType,
      );
      return updateSystem(templateType, patch, existing);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const orgMutation = useMutation({
    mutationFn: ({
      orgId,
      templateType,
      patch,
    }: {
      orgId: string;
      templateType: TemplateType;
      patch: TemplatePatch;
    }) => {
      const existing = (queryClient.getQueryData<EmailTemplate[]>(QUERY_KEY) ?? []).find(
        (t) => t.orgId === orgId && t.templateType === templateType,
      );
      return upsertOrg(orgId, templateType, patch, existing);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ orgId, templateType }: { orgId: string; templateType: TemplateType }) => {
      const existing = (queryClient.getQueryData<EmailTemplate[]>(QUERY_KEY) ?? []).find(
        (t) => t.orgId === orgId && t.templateType === templateType,
      );
      if (!existing) throw new Error('Override not found');
      return deleteOrg(existing.id);
    },
    onMutate: async ({ orgId, templateType }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous = queryClient.getQueryData<EmailTemplate[]>(QUERY_KEY);
      queryClient.setQueryData<EmailTemplate[]>(QUERY_KEY, (prev) =>
        prev ? prev.filter((t) => !(t.orgId === orgId && t.templateType === templateType)) : prev,
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(QUERY_KEY, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  return {
    templates: query.data ?? [],
    isLoading: query.isLoading,
    updateSystemTemplate: (templateType, patch) => systemMutation.mutate({ templateType, patch }),
    upsertOrgOverride: (orgId, templateType, patch) =>
      orgMutation.mutate({ orgId, templateType, patch }),
    deleteOrgOverride: (orgId, templateType) => deleteMutation.mutate({ orgId, templateType }),
    isSaving: systemMutation.isPending || orgMutation.isPending || deleteMutation.isPending,
  };
}
