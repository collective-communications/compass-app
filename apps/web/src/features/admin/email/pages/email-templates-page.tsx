/**
 * Admin email templates management page.
 * Edit system-default email templates and create per-org overrides.
 * Route: /email-templates
 */

import {
  useState,
  useCallback,
  type ReactElement,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import { useOrganizations } from '../../clients/hooks/use-organizations';
import {
  useEmailTemplates,
  type EmailTemplate,
  type TemplateType,
  type TemplatePatch,
} from '../hooks/use-email-templates';

// ── Constants ────────────────────────────────────────────────────────────────

const TEMPLATE_TYPES: TemplateType[] = ['survey_invitation', 'reminder', 'report_ready'];

const TEMPLATE_META: Record<
  TemplateType,
  { label: string; description: string; variables: string[] }
> = {
  survey_invitation: {
    label: 'Survey Invitation',
    description: 'Sent when participants are invited to complete a survey.',
    variables: ['{{organization_name}}', '{{recipient_name}}', '{{survey_link}}'],
  },
  reminder: {
    label: 'Survey Reminder',
    description: 'Sent to participants who have not yet completed the survey.',
    variables: [
      '{{organization_name}}',
      '{{recipient_name}}',
      '{{survey_link}}',
      '{{close_date}}',
    ],
  },
  report_ready: {
    label: 'Report Ready',
    description: 'Sent to client users when survey results are available.',
    variables: ['{{organization_name}}', '{{recipient_name}}', '{{dashboard_link}}'],
  },
};

// ── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCards(): ReactElement {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading templates">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-40 animate-pulse rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)]"
        />
      ))}
    </div>
  );
}

// ── Variable chips ────────────────────────────────────────────────────────────

interface VariableChipsProps {
  variables: string[];
}

function VariableChips({ variables }: VariableChipsProps): ReactElement {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = useCallback((variable: string): void => {
    void navigator.clipboard.writeText(variable).then(() => {
      setCopied(variable);
      setTimeout(() => setCopied((prev) => (prev === variable ? null : prev)), 1500);
    });
  }, []);

  return (
    <div className="flex flex-wrap gap-1.5">
      {variables.map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => handleCopy(v)}
          title="Click to copy"
          className="rounded bg-[var(--grey-100)] px-2 py-0.5 font-mono text-xs text-[var(--text-secondary)] transition-colors hover:bg-[var(--grey-200)] active:bg-[var(--grey-300)]"
        >
          {copied === v ? '✓ copied' : v}
        </button>
      ))}
    </div>
  );
}

// ── HTML preview ─────────────────────────────────────────────────────────────

interface HtmlPreviewProps {
  html: string;
}

function HtmlPreview({ html }: HtmlPreviewProps): ReactElement {
  return (
    <div className="rounded-lg border border-[var(--grey-100)] bg-white p-6">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--text-secondary)]">
        Preview
      </p>
      <div
        className="prose prose-sm max-w-none text-sm text-[var(--text-primary)]"
        dangerouslySetInnerHTML={{ __html: html || '<em style="color:#999">No content yet.</em>' }}
      />
    </div>
  );
}

// ── Template edit form ────────────────────────────────────────────────────────

interface TemplateEditFormProps {
  initialSubject: string;
  initialHtmlBody: string;
  variables: string[];
  isSaving: boolean;
  saveLabel: string;
  onSave: (patch: TemplatePatch) => void;
  onCancel: () => void;
}

function TemplateEditForm({
  initialSubject,
  initialHtmlBody,
  variables,
  isSaving,
  saveLabel,
  onSave,
  onCancel,
}: TemplateEditFormProps): ReactElement {
  const [subject, setSubject] = useState(initialSubject);
  const [htmlBody, setHtmlBody] = useState(initialHtmlBody);

  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>): void => {
      e.preventDefault();
      onSave({ subject: subject.trim(), htmlBody: htmlBody.trim() });
    },
    [subject, htmlBody, onSave],
  );

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      {/* Subject */}
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-[var(--text-secondary)]">Subject line</span>
        <input
          type="text"
          value={subject}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setSubject(e.target.value)}
          className="rounded-md border border-[var(--grey-100)] bg-[var(--surface-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-interactive)]/30"
          required
          maxLength={300}
        />
      </label>

      {/* HTML body + live preview */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-[var(--text-secondary)]">HTML body</span>
          <textarea
            value={htmlBody}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setHtmlBody(e.target.value)}
            rows={10}
            className="rounded-md border border-[var(--grey-100)] bg-[var(--surface-card)] px-3 py-2 font-mono text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-interactive)]/30"
            required
          />
        </label>
        <HtmlPreview html={htmlBody} />
      </div>

      {/* Variables reference */}
      <div>
        <p className="mb-1.5 text-xs font-medium text-[var(--text-secondary)]">
          Available variables — click to copy
        </p>
        <VariableChips variables={variables} />
      </div>

      {/* Form actions */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-lg bg-[var(--color-interactive)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-interactive)]/90 disabled:opacity-60"
        >
          {isSaving ? 'Saving…' : saveLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--grey-50)]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Template card ─────────────────────────────────────────────────────────────

interface TemplateCardProps {
  templateType: TemplateType;
  systemDefault: EmailTemplate | undefined;
  orgOverride: EmailTemplate | undefined;
  selectedOrgId: string | null;
  selectedOrgName: string;
  isSaving: boolean;
  onSaveSystem: (templateType: TemplateType, patch: TemplatePatch) => void;
  onSaveOrgOverride: (orgId: string, templateType: TemplateType, patch: TemplatePatch) => void;
  onDeleteOrgOverride: (orgId: string, templateType: TemplateType) => void;
}

function TemplateCard({
  templateType,
  systemDefault,
  orgOverride,
  selectedOrgId,
  selectedOrgName,
  isSaving,
  onSaveSystem,
  onSaveOrgOverride,
  onDeleteOrgOverride,
}: TemplateCardProps): ReactElement {
  const [isEditing, setIsEditing] = useState(false);
  const meta = TEMPLATE_META[templateType];

  // The displayed template depends on whether we're in org mode
  const displayed = selectedOrgId !== null ? (orgOverride ?? systemDefault) : systemDefault;
  const hasOrgOverride = selectedOrgId !== null && orgOverride !== undefined;
  const isSystemMode = selectedOrgId === null;

  const handleSave = useCallback(
    (patch: TemplatePatch): void => {
      if (isSystemMode) {
        onSaveSystem(templateType, patch);
      } else {
        onSaveOrgOverride(selectedOrgId!, templateType, patch);
      }
      setIsEditing(false);
    },
    [isSystemMode, templateType, selectedOrgId, onSaveSystem, onSaveOrgOverride],
  );

  const handleCustomize = useCallback((): void => {
    setIsEditing(true);
  }, []);

  const handleReset = useCallback((): void => {
    if (selectedOrgId) {
      onDeleteOrgOverride(selectedOrgId, templateType);
      setIsEditing(false);
    }
  }, [selectedOrgId, templateType, onDeleteOrgOverride]);

  const handleCancel = useCallback((): void => {
    setIsEditing(false);
  }, []);

  return (
    <div className="rounded-lg border border-[var(--grey-100)] bg-[var(--surface-card)] p-6">
      {/* Card header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">{meta.label}</h2>
          <p className="mt-0.5 text-sm text-[var(--text-secondary)]">{meta.description}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/* Status badge */}
          {selectedOrgId !== null && (
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-medium"
              style={
                hasOrgOverride
                  ? {
                      backgroundColor: 'var(--status-active-surface)',
                      color: 'var(--status-active-text)',
                    }
                  : {
                      backgroundColor: 'var(--grey-100)',
                      color: 'var(--text-secondary)',
                    }
              }
            >
              {hasOrgOverride ? `${selectedOrgName} override` : 'Using system default'}
            </span>
          )}

          {/* Actions */}
          {!isEditing && (
            <>
              {isSystemMode ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="rounded-lg px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--grey-50)]"
                >
                  Edit
                </button>
              ) : hasOrgOverride ? (
                <>
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="rounded-lg px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--grey-50)]"
                  >
                    Edit override
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="rounded-lg px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--grey-50)]"
                  >
                    Reset to default
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleCustomize}
                  className="rounded-lg bg-[var(--color-interactive)] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-interactive)]/90"
                >
                  Customize for {selectedOrgName}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Current subject preview (collapsed state) */}
      {!isEditing && displayed && (
        <div className="mt-4 space-y-1.5">
          <p className="text-xs text-[var(--text-secondary)]">
            <span className="font-medium">Subject:</span>{' '}
            <span className="text-[var(--text-primary)]">{displayed.subject}</span>
          </p>
          <p className="line-clamp-2 text-xs text-[var(--text-secondary)]">
            <span className="font-medium">Body preview:</span>{' '}
            <span
              className="text-[var(--text-primary)]"
              dangerouslySetInnerHTML={{
                __html: displayed.htmlBody.replace(/<[^>]*>/g, ' ').slice(0, 160) + '…',
              }}
            />
          </p>
        </div>
      )}

      {/* No template found (shouldn't happen for system defaults) */}
      {!isEditing && !displayed && (
        <p className="mt-4 text-sm text-[var(--text-secondary)]">No template found.</p>
      )}

      {/* Edit form */}
      {isEditing && (
        <TemplateEditForm
          initialSubject={displayed?.subject ?? ''}
          initialHtmlBody={displayed?.htmlBody ?? ''}
          variables={meta.variables}
          isSaving={isSaving}
          saveLabel={
            isSystemMode
              ? 'Save system default'
              : hasOrgOverride
                ? 'Save override'
                : `Customize for ${selectedOrgName}`
          }
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export function EmailTemplatesPage(): ReactElement {
  const { templates, isLoading, updateSystemTemplate, upsertOrgOverride, deleteOrgOverride, isSaving } =
    useEmailTemplates();
  const orgsQuery = useOrganizations();

  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  const selectedOrg = orgsQuery.data?.find((o) => o.id === selectedOrgId);
  const selectedOrgName = selectedOrg?.name ?? '';

  const systemDefault = (type: TemplateType): EmailTemplate | undefined =>
    templates.find((t) => t.orgId === null && t.templateType === type);

  const orgOverride = (type: TemplateType): EmailTemplate | undefined =>
    selectedOrgId !== null
      ? templates.find((t) => t.orgId === selectedOrgId && t.templateType === type)
      : undefined;

  const handleOrgChange = useCallback((e: ChangeEvent<HTMLSelectElement>): void => {
    setSelectedOrgId(e.target.value === '' ? null : e.target.value);
  }, []);

  return (
    <div>
      {/* Page heading */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--grey-900)]">Email Templates</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Manage the emails sent to participants and client users. System defaults apply to all
            organizations unless overridden.
          </p>
        </div>

        {/* Org selector */}
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-[var(--text-secondary)]">Viewing for</span>
          <select
            value={selectedOrgId ?? ''}
            onChange={handleOrgChange}
            className="min-w-[220px] rounded-md border border-[var(--grey-100)] bg-[var(--surface-card)] px-3 py-2 text-sm text-[var(--text-primary)]"
          >
            <option value="">System defaults (all organizations)</option>
            {(orgsQuery.data ?? []).map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Context note for org mode */}
      {selectedOrgId !== null && (
        <div className="mb-6 rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)] px-4 py-3 text-sm text-[var(--text-secondary)]">
          Showing templates for <span className="font-medium text-[var(--text-primary)]">{selectedOrgName}</span>.
          Customized templates override the system defaults for this organization only.
        </div>
      )}

      {/* Template cards */}
      {isLoading ? (
        <SkeletonCards />
      ) : (
        <div className="flex flex-col gap-4">
          {TEMPLATE_TYPES.map((type) => (
            <TemplateCard
              key={type}
              templateType={type}
              systemDefault={systemDefault(type)}
              orgOverride={orgOverride(type)}
              selectedOrgId={selectedOrgId}
              selectedOrgName={selectedOrgName}
              isSaving={isSaving}
              onSaveSystem={updateSystemTemplate}
              onSaveOrgOverride={upsertOrgOverride}
              onDeleteOrgOverride={deleteOrgOverride}
            />
          ))}
        </div>
      )}
    </div>
  );
}
