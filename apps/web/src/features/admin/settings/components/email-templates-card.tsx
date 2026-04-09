/**
 * Email templates settings card.
 * Fetches templates from database and supports inline editing with save.
 */

import { useState, useCallback, type ReactElement } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '../../../../components/ui/card';
import { supabase } from '../../../../lib/supabase';

// ─── Types ──────────────────────────────────────────────────────────────────

interface EmailTemplate {
  id: string;
  orgId: string | null;
  templateType: string;
  subject: string;
  htmlBody: string;
}

interface EmailTemplateRow {
  id: string;
  org_id: string | null;
  template_type: string;
  subject: string;
  html_body: string;
}

// ─── Display Names ──────────────────────────────────────────────────────────

const TEMPLATE_NAMES: Record<string, string> = {
  survey_invitation: 'Survey invitation',
  reminder: 'Reminder email',
  report_ready: 'Report ready notification',
};

// ─── Query Keys ─────────────────────────────────────────────────────────────

const templateKeys = {
  all: ['admin', 'email-templates'] as const,
  defaults: () => [...templateKeys.all, 'defaults'] as const,
};

// ─── Data Fetching ──────────────────────────────────────────────────────────

function mapRow(row: EmailTemplateRow): EmailTemplate {
  return {
    id: row.id,
    orgId: row.org_id,
    templateType: row.template_type,
    subject: row.subject,
    htmlBody: row.html_body,
  };
}

async function fetchDefaultTemplates(): Promise<EmailTemplate[]> {
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .is('org_id', null)
    .order('template_type');

  if (error) throw error;
  return (data ?? []).map((row) => mapRow(row as EmailTemplateRow));
}

async function saveTemplate(template: EmailTemplate): Promise<EmailTemplate> {
  const { data, error } = await supabase
    .from('email_templates')
    .upsert(
      {
        id: template.id,
        org_id: template.orgId,
        template_type: template.templateType,
        subject: template.subject,
        html_body: template.htmlBody,
      },
      { onConflict: 'id' },
    )
    .select('*')
    .single();

  if (error) throw error;
  return mapRow(data as EmailTemplateRow);
}

// ─── Component ──────────────────────────────────────────────────────────────

export function EmailTemplatesCard(): ReactElement {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editState, setEditState] = useState<Record<string, { subject: string; htmlBody: string }>>({});

  const { data: templates = [], isLoading } = useQuery({
    queryKey: templateKeys.defaults(),
    queryFn: fetchDefaultTemplates,
  });

  const saveMutation = useMutation({
    mutationFn: saveTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.all });
    },
  });

  const toggleExpand = useCallback((id: string): void => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const handleEdit = useCallback((id: string, field: 'subject' | 'htmlBody', value: string): void => {
    setEditState((prev) => ({
      ...prev,
      [id]: {
        subject: prev[id]?.subject ?? '',
        htmlBody: prev[id]?.htmlBody ?? '',
        [field]: value,
      },
    }));
  }, []);

  const handleSave = useCallback(
    (template: EmailTemplate): void => {
      const edits = editState[template.id];
      if (!edits) return;

      saveMutation.mutate({
        ...template,
        subject: edits.subject,
        htmlBody: edits.htmlBody,
      });
    },
    [editState, saveMutation],
  );

  const initEditState = useCallback((template: EmailTemplate): void => {
    setEditState((prev) => {
      if (prev[template.id]) return prev;
      return {
        ...prev,
        [template.id]: { subject: template.subject, htmlBody: template.htmlBody },
      };
    });
  }, []);

  return (
    <Card className="rounded-lg">
      <fieldset>
        <legend className="mb-4 text-lg font-semibold text-[var(--grey-900)]">
          Email Templates
        </legend>

        {isLoading ? (
          <p className="text-sm text-[var(--text-secondary)]">Loading templates...</p>
        ) : (
          <div className="flex flex-col divide-y divide-[var(--grey-100)]">
            {templates.map((template) => {
              const isExpanded = expandedId === template.id;
              const edits = editState[template.id];
              const hasChanges = edits
                ? edits.subject !== template.subject || edits.htmlBody !== template.htmlBody
                : false;

              return (
                <div key={template.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[var(--grey-700)]">
                      {TEMPLATE_NAMES[template.templateType] ?? template.templateType}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        toggleExpand(template.id);
                        initEditState(template);
                      }}
                      aria-expanded={isExpanded}
                      aria-controls={`template-${template.id}`}
                      className="text-xs font-medium text-[var(--color-interactive)] hover:underline"
                    >
                      {isExpanded ? 'Collapse' : 'Preview / Edit'}
                    </button>
                  </div>

                  {isExpanded && edits && (
                    <div
                      id={`template-${template.id}`}
                      className="mt-3 space-y-3"
                    >
                      <div>
                        <label
                          htmlFor={`subject-${template.id}`}
                          className="mb-1 block text-xs font-medium text-[var(--text-secondary)]"
                        >
                          Subject
                        </label>
                        <input
                          id={`subject-${template.id}`}
                          type="text"
                          value={edits.subject}
                          onChange={(e) => handleEdit(template.id, 'subject', e.target.value)}
                          className="w-full rounded-lg border border-[var(--grey-100)] px-3 py-2 text-sm text-[var(--grey-900)] focus:border-[var(--color-interactive)] focus:outline-none focus:ring-1 focus:ring-[var(--color-interactive)]"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor={`body-${template.id}`}
                          className="mb-1 block text-xs font-medium text-[var(--text-secondary)]"
                        >
                          Body
                        </label>
                        <textarea
                          id={`body-${template.id}`}
                          value={edits.htmlBody}
                          onChange={(e) => handleEdit(template.id, 'htmlBody', e.target.value)}
                          rows={5}
                          className="w-full rounded-lg border border-[var(--grey-100)] px-3 py-2 text-sm text-[var(--grey-900)] focus:border-[var(--color-interactive)] focus:outline-none focus:ring-1 focus:ring-[var(--color-interactive)]"
                        />
                      </div>
                      <p className="text-xs text-[var(--text-tertiary)]">
                        Variables: {'{{organization_name}}'}, {'{{survey_link}}'}, {'{{close_date}}'}, {'{{dashboard_link}}'}, {'{{recipient_name}}'}
                      </p>
                      {hasChanges && (
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleSave(template)}
                            disabled={saveMutation.isPending}
                            className="rounded-lg bg-[var(--grey-900)] px-4 py-1.5 text-sm font-medium text-[var(--grey-50)] hover:bg-[var(--grey-800)] disabled:opacity-50"
                          >
                            {saveMutation.isPending ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </fieldset>
    </Card>
  );
}
