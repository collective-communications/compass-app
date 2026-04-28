/**
 * Admin recommendation templates management page.
 * Lets ccc_admin users view, create, edit, and delete recommendation templates.
 * Route: /recommendations
 */

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactElement,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import { PillTabNav } from '../../../../components/navigation/pill-tab-nav';
import {
  useRecommendationTemplates,
  type RecommendationTemplate,
} from '../hooks/use-recommendation-templates';

// ── Constants ────────────────────────────────────────────────────────────────

const DIMENSION_TABS = [
  { id: 'all', label: 'All' },
  { id: 'core', label: 'Core' },
  { id: 'clarity', label: 'Clarity' },
  { id: 'connection', label: 'Connection' },
  { id: 'collaboration', label: 'Collaboration' },
] as const;

type DimensionFilter = (typeof DIMENSION_TABS)[number]['id'];

const DIMENSION_OPTIONS = [
  { value: 'core', label: 'Core' },
  { value: 'clarity', label: 'Clarity' },
  { value: 'connection', label: 'Connection' },
  { value: 'collaboration', label: 'Collaboration' },
] as const;

const SEVERITY_OPTIONS = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'healthy', label: 'Healthy' },
] as const;

const DELETE_UNDO_DURATION_MS = 4000;

// ── Helpers ──────────────────────────────────────────────────────────────────

type DimensionCode = RecommendationTemplate['dimensionCode'];
type Severity = RecommendationTemplate['severity'];

function dimensionVar(code: DimensionCode): string {
  const map: Record<DimensionCode, string> = {
    core: 'var(--color-core)',
    clarity: 'var(--color-clarity)',
    connection: 'var(--color-connection)',
    collaboration: 'var(--color-collaboration)',
  };
  return map[code];
}

function severityBorderVar(severity: Severity): string {
  const map: Record<Severity, string> = {
    critical: 'var(--severity-critical-border)',
    high: 'var(--severity-high-border)',
    medium: 'var(--severity-medium-border)',
    healthy: 'var(--severity-healthy-border)',
  };
  return map[severity];
}

function severityTextVar(severity: Severity): string {
  const map: Record<Severity, string> = {
    critical: 'var(--severity-critical-text)',
    high: 'var(--severity-high-text)',
    medium: 'var(--severity-medium-text)',
    healthy: 'var(--severity-healthy-text)',
  };
  return map[severity];
}

// ── Blank form state ─────────────────────────────────────────────────────────

interface TemplateFormState {
  dimensionCode: DimensionCode;
  severity: Severity;
  priority: number;
  title: string;
  body: string;
  actions: string[];
  trustLadderLink: string;
  cccServiceLink: string;
  isActive: boolean;
}

function blankForm(): TemplateFormState {
  return {
    dimensionCode: 'core',
    severity: 'medium',
    priority: 0,
    title: '',
    body: '',
    actions: [''],
    trustLadderLink: '',
    cccServiceLink: '',
    isActive: true,
  };
}

function formFromTemplate(t: RecommendationTemplate): TemplateFormState {
  return {
    dimensionCode: t.dimensionCode,
    severity: t.severity,
    priority: t.priority,
    title: t.title,
    body: t.body,
    actions: t.actions.length > 0 ? t.actions : [''],
    trustLadderLink: t.trustLadderLink ?? '',
    cccServiceLink: t.cccServiceLink ?? '',
    isActive: t.isActive,
  };
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRows(): ReactElement {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading templates">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="h-16 animate-pulse rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)]"
        />
      ))}
    </div>
  );
}

// ── Inline template form ─────────────────────────────────────────────────────

interface TemplateFormProps {
  initialValues: TemplateFormState;
  isSaving: boolean;
  onSave: (values: TemplateFormState) => void;
  onCancel: () => void;
  saveLabel: string;
}

function TemplateForm({
  initialValues,
  isSaving,
  onSave,
  onCancel,
  saveLabel,
}: TemplateFormProps): ReactElement {
  const [form, setForm] = useState<TemplateFormState>(initialValues);

  const setField = useCallback(
    <K extends keyof TemplateFormState>(key: K, value: TemplateFormState[K]): void => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleActionChange = useCallback((index: number, value: string): void => {
    setForm((prev) => {
      const next = [...prev.actions];
      next[index] = value;
      return { ...prev, actions: next };
    });
  }, []);

  const addAction = useCallback((): void => {
    setForm((prev) => ({ ...prev, actions: [...prev.actions, ''] }));
  }, []);

  const removeAction = useCallback((index: number): void => {
    setForm((prev) => ({
      ...prev,
      actions: prev.actions.filter((_, i) => i !== index),
    }));
  }, []);

  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>): void => {
      e.preventDefault();
      const cleaned: TemplateFormState = {
        ...form,
        actions: form.actions.filter((a) => a.trim() !== ''),
        trustLadderLink: form.trustLadderLink.trim() || '',
        cccServiceLink: form.cccServiceLink.trim() || '',
      };
      onSave(cleaned);
    },
    [form, onSave],
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 rounded-lg border border-[var(--grey-100)] bg-[var(--surface-card)] p-6"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Dimension */}
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-[var(--text-secondary)]">Dimension</span>
          <select
            value={form.dimensionCode}
            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
              setField('dimensionCode', e.target.value as DimensionCode)
            }
            className="rounded-md border border-[var(--grey-100)] bg-[var(--surface-card)] px-3 py-2 text-sm text-[var(--text-primary)]"
            required
          >
            {DIMENSION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        {/* Severity */}
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-[var(--text-secondary)]">Severity</span>
          <select
            value={form.severity}
            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
              setField('severity', e.target.value as Severity)
            }
            className="rounded-md border border-[var(--grey-100)] bg-[var(--surface-card)] px-3 py-2 text-sm text-[var(--text-primary)]"
            required
          >
            {SEVERITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        {/* Priority */}
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-[var(--text-secondary)]">Priority</span>
          <input
            type="number"
            value={form.priority}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setField('priority', parseInt(e.target.value, 10) || 0)
            }
            className="rounded-md border border-[var(--grey-100)] bg-[var(--surface-card)] px-3 py-2 text-sm text-[var(--text-primary)]"
          />
        </label>

        {/* Active toggle */}
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-[var(--text-secondary)]">Active</span>
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setField('isActive', e.target.checked)
              }
              className="h-4 w-4"
              id="form-is-active"
            />
            <span className="text-sm text-[var(--text-primary)]">
              {form.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </label>
      </div>

      {/* Title */}
      <label className="mt-4 flex flex-col gap-1">
        <span className="text-xs font-medium text-[var(--text-secondary)]">Title</span>
        <input
          type="text"
          value={form.title}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setField('title', e.target.value)}
          className="rounded-md border border-[var(--grey-100)] bg-[var(--surface-card)] px-3 py-2 text-sm text-[var(--text-primary)]"
          required
          maxLength={200}
        />
      </label>

      {/* Body */}
      <label className="mt-4 flex flex-col gap-1">
        <span className="text-xs font-medium text-[var(--text-secondary)]">Body</span>
        <textarea
          value={form.body}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setField('body', e.target.value)}
          rows={4}
          className="rounded-md border border-[var(--grey-100)] bg-[var(--surface-card)] px-3 py-2 text-sm text-[var(--text-primary)]"
          required
        />
      </label>

      {/* Actions */}
      <div className="mt-4 flex flex-col gap-1">
        <span className="text-xs font-medium text-[var(--text-secondary)]">Actions</span>
        {form.actions.map((action, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <input
              type="text"
              value={action}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                handleActionChange(idx, e.target.value)
              }
              placeholder={`Action ${idx + 1}`}
              className="flex-1 rounded-md border border-[var(--grey-100)] bg-[var(--surface-card)] px-3 py-2 text-sm text-[var(--text-primary)]"
            />
            {form.actions.length > 1 && (
              <button
                type="button"
                onClick={() => removeAction(idx)}
                aria-label="Remove action"
                className="rounded px-2 py-1 text-sm text-[var(--text-secondary)] hover:bg-[var(--grey-50)]"
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addAction}
          className="mt-1 w-fit text-sm text-[var(--color-interactive)] hover:underline"
        >
          + Add action
        </button>
      </div>

      {/* Optional links */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-[var(--text-secondary)]">
            Trust Ladder Link (optional)
          </span>
          <input
            type="url"
            value={form.trustLadderLink}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setField('trustLadderLink', e.target.value)
            }
            className="rounded-md border border-[var(--grey-100)] bg-[var(--surface-card)] px-3 py-2 text-sm text-[var(--text-primary)]"
            placeholder="https://..."
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-[var(--text-secondary)]">
            CC+C Service Link (optional)
          </span>
          <input
            type="url"
            value={form.cccServiceLink}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setField('cccServiceLink', e.target.value)
            }
            className="rounded-md border border-[var(--grey-100)] bg-[var(--surface-card)] px-3 py-2 text-sm text-[var(--text-primary)]"
            placeholder="https://..."
          />
        </label>
      </div>

      {/* Form actions */}
      <div className="mt-6 flex items-center gap-3">
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

// ── Template row ─────────────────────────────────────────────────────────────

interface TemplateRowProps {
  template: RecommendationTemplate;
  isEditing: boolean;
  isSaving: boolean;
  pendingDeleteId: string | null;
  onToggleActive: (id: string, value: boolean) => void;
  onEdit: (id: string) => void;
  onSaveEdit: (id: string, values: TemplateFormState) => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
  onUndoDelete: (id: string) => void;
}

function TemplateRow({
  template,
  isEditing,
  isSaving,
  pendingDeleteId,
  onToggleActive,
  onEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onUndoDelete,
}: TemplateRowProps): ReactElement {
  const isPendingDelete = pendingDeleteId === template.id;

  if (isPendingDelete) {
    return (
      <div
        className="flex items-center justify-between rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)] px-4 py-3"
        role="status"
      >
        <span className="text-sm text-[var(--text-secondary)]">
          Template deleted.{' '}
          <button
            type="button"
            onClick={() => onUndoDelete(template.id)}
            className="font-medium text-[var(--color-interactive)] underline"
          >
            Undo
          </button>
        </span>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border border-[var(--grey-100)] bg-[var(--surface-card)]"
      style={{ borderLeftWidth: '4px', borderLeftColor: severityBorderVar(template.severity) }}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Dimension badge */}
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-white"
          style={{ backgroundColor: dimensionVar(template.dimensionCode) }}
        >
          {template.dimensionCode}
        </span>

        {/* Severity badge */}
        <span
          className="shrink-0 rounded px-2 py-0.5 text-xs font-medium capitalize"
          style={{ color: severityTextVar(template.severity) }}
        >
          {template.severity}
        </span>

        {/* Priority */}
        <span
          className="shrink-0 rounded bg-[var(--grey-50)] px-2 py-0.5 text-xs text-[var(--text-secondary)]"
          aria-label={`Priority ${template.priority}`}
        >
          #{template.priority}
        </span>

        {/* Title */}
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--text-primary)]">
          {template.title}
        </span>

        {/* Active toggle */}
        <label className="flex shrink-0 items-center gap-1.5" aria-label="Toggle active">
          <input
            type="checkbox"
            checked={template.isActive}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onToggleActive(template.id, e.target.checked)
            }
            className="h-4 w-4"
          />
          <span className="text-xs text-[var(--text-secondary)]">
            {template.isActive ? 'Active' : 'Inactive'}
          </span>
        </label>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => onEdit(template.id)}
            className="rounded px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--grey-50)]"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete(template.id)}
            className="rounded px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--grey-50)]"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Inline edit form */}
      {isEditing && (
        <div className="border-t border-[var(--grey-100)] px-4 pb-4">
          <TemplateForm
            initialValues={formFromTemplate(template)}
            isSaving={isSaving}
            onSave={(values) => onSaveEdit(template.id, values)}
            onCancel={onCancelEdit}
            saveLabel="Save changes"
          />
        </div>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export function RecommendationsPage(): ReactElement {
  const { templates, isLoading, createTemplate, updateTemplate, deleteTemplate, isSaving } =
    useRecommendationTemplates();

  const [dimensionFilter, setDimensionFilter] = useState<DimensionFilter>('all');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  /** Maps template id → pending-delete state. Cleared on undo or timer expiry. */
  const [pendingDeletes, setPendingDeletes] = useState<Record<string, boolean>>({});
  const deleteTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const filtered = templates.filter((t) => {
    if (dimensionFilter !== 'all' && t.dimensionCode !== dimensionFilter) return false;
    if (showActiveOnly && !t.isActive) return false;
    return true;
  });

  const handleToggleActive = useCallback(
    (id: string, value: boolean): void => {
      updateTemplate(id, { isActive: value });
    },
    [updateTemplate],
  );

  const handleEdit = useCallback((id: string): void => {
    setShowCreateForm(false);
    setEditingId(id);
  }, []);

  const handleSaveEdit = useCallback(
    (id: string, values: TemplateFormState): void => {
      updateTemplate(id, {
        dimensionCode: values.dimensionCode,
        severity: values.severity,
        priority: values.priority,
        title: values.title,
        body: values.body,
        actions: values.actions,
        trustLadderLink: values.trustLadderLink.trim() || null,
        cccServiceLink: values.cccServiceLink.trim() || null,
        isActive: values.isActive,
      });
      setEditingId(null);
    },
    [updateTemplate],
  );

  const handleCancelEdit = useCallback((): void => {
    setEditingId(null);
  }, []);

  const handleCreate = useCallback(
    (values: TemplateFormState): void => {
      createTemplate({
        dimensionCode: values.dimensionCode,
        severity: values.severity,
        priority: values.priority,
        title: values.title,
        body: values.body,
        actions: values.actions,
        trustLadderLink: values.trustLadderLink.trim() || null,
        cccServiceLink: values.cccServiceLink.trim() || null,
        isActive: values.isActive,
      });
      setShowCreateForm(false);
    },
    [createTemplate],
  );

  const handleDeleteStart = useCallback((id: string): void => {
    setPendingDeletes((prev) => ({ ...prev, [id]: true }));
    const timer = setTimeout(() => {
      deleteTemplate(id);
      setPendingDeletes((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      delete deleteTimers.current[id];
    }, DELETE_UNDO_DURATION_MS);
    deleteTimers.current[id] = timer;
  }, [deleteTemplate]);

  const handleUndoDelete = useCallback((id: string): void => {
    const timer = deleteTimers.current[id];
    if (timer !== undefined) {
      clearTimeout(timer);
      delete deleteTimers.current[id];
    }
    setPendingDeletes((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  useEffect(() => {
    const timers = deleteTimers.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  const pendingDeleteId = Object.keys(pendingDeletes).find((id) => pendingDeletes[id]) ?? null;

  return (
    <div>
      {/* Page heading */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--grey-900)]">Recommendation Templates</h1>
        <button
          type="button"
          onClick={() => {
            setEditingId(null);
            setShowCreateForm(true);
          }}
          className="rounded-lg bg-[var(--color-interactive)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-interactive)]/90"
        >
          + New Template
        </button>
      </div>

      {/* Create form */}
      {showCreateForm && (
        <div className="mb-6">
          <TemplateForm
            initialValues={blankForm()}
            isSaving={isSaving}
            onSave={handleCreate}
            onCancel={() => setShowCreateForm(false)}
            saveLabel="Create template"
          />
        </div>
      )}

      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <PillTabNav
          tabs={[...DIMENSION_TABS]}
          activeId={dimensionFilter}
          onSelect={(id) => setDimensionFilter(id as DimensionFilter)}
          ariaLabel="Filter by dimension"
          idPrefix="dim-filter"
        />

        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <input
            type="checkbox"
            checked={showActiveOnly}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setShowActiveOnly(e.target.checked)}
            className="h-4 w-4"
          />
          Active only
        </label>
      </div>

      {/* Template count */}
      {!isLoading && (
        <p className="mb-3 text-xs text-[var(--text-secondary)]">
          {filtered.length} template{filtered.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Loading */}
      {isLoading && <SkeletonRows />}

      {/* Empty state */}
      {!isLoading && filtered.length === 0 && (
        <div className="rounded-lg border border-[var(--grey-100)] bg-[var(--surface-card)] py-12 text-center">
          <p className="text-sm text-[var(--text-secondary)]">
            {dimensionFilter !== 'all' || !showActiveOnly
              ? 'No templates match the current filters.'
              : 'No templates yet. Create the first one above.'}
          </p>
        </div>
      )}

      {/* Template list */}
      {!isLoading && filtered.length > 0 && (
        <div className="flex flex-col gap-2">
          {filtered.map((template) => (
            <TemplateRow
              key={template.id}
              template={template}
              isEditing={editingId === template.id}
              isSaving={isSaving}
              pendingDeleteId={pendingDeleteId}
              onToggleActive={handleToggleActive}
              onEdit={handleEdit}
              onSaveEdit={handleSaveEdit}
              onCancelEdit={handleCancelEdit}
              onDelete={handleDeleteStart}
              onUndoDelete={handleUndoDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
