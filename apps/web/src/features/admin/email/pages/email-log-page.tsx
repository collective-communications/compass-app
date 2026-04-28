/**
 * Admin email log page.
 * Read-only view of the `email_log` table for ccc_admin users.
 * Route: /email-log
 */

import { useState, useCallback, type ReactElement } from 'react';
import { PillTabNav } from '../../../../components/navigation/pill-tab-nav';
import { useEmailLog, type EmailLogEntry } from '../hooks/use-email-log';

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_TABS = [
  { id: 'all', label: 'All' },
  { id: 'sent', label: 'Sent' },
  { id: 'failed', label: 'Failed' },
  { id: 'queued', label: 'Queued' },
] as const;

type StatusFilter = (typeof STATUS_TABS)[number]['id'];

const TEMPLATE_TABS = [
  { id: 'all', label: 'All' },
  { id: 'survey_invitation', label: 'Survey Invitation' },
  { id: 'reminder', label: 'Reminder' },
  { id: 'report_ready', label: 'Report Ready' },
  { id: 'team_invitation', label: 'Team Invitation' },
] as const;

type TemplateFilter = (typeof TEMPLATE_TABS)[number]['id'];

const TEMPLATE_LABELS: Record<string, string> = {
  survey_invitation: 'Survey Invite',
  reminder: 'Reminder',
  report_ready: 'Report Ready',
  team_invitation: 'Team Invite',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function templateLabel(rawType: string): string {
  return TEMPLATE_LABELS[rawType] ?? rawType;
}

function formatSentAt(value: string | null): string {
  if (value === null) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-CA', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function statusBorderColor(status: EmailLogEntry['status']): string {
  const map: Record<EmailLogEntry['status'], string> = {
    sent: 'var(--status-active-border)',
    failed: 'var(--feedback-error-border)',
    queued: 'var(--grey-300)',
  };
  return map[status];
}

function statusLabel(status: EmailLogEntry['status']): string {
  const map: Record<EmailLogEntry['status'], string> = {
    sent: 'Sent',
    failed: 'Failed',
    queued: 'Queued',
  };
  return map[status];
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRows(): ReactElement {
  return (
    <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading email log">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="h-14 animate-pulse rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)]"
        />
      ))}
    </div>
  );
}

// ── Summary chips ─────────────────────────────────────────────────────────────

interface SummaryChipsProps {
  entries: EmailLogEntry[];
}

function SummaryChips({ entries }: SummaryChipsProps): ReactElement {
  const total = entries.length;
  const sent = entries.filter((e) => e.status === 'sent').length;
  const failed = entries.filter((e) => e.status === 'failed').length;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <span className="rounded-full bg-[var(--grey-100)] px-3 py-1 text-xs text-[var(--text-secondary)]">
        {total} loaded
      </span>
      <span className="rounded-full bg-[var(--grey-100)] px-3 py-1 text-xs text-[var(--text-secondary)]">
        {sent} sent
      </span>
      <span
        className="rounded-full px-3 py-1 text-xs"
        style={{
          backgroundColor: failed > 0 ? 'var(--feedback-error-surface)' : 'var(--grey-100)',
          color: failed > 0 ? 'var(--feedback-error-text)' : 'var(--text-secondary)',
        }}
      >
        {failed} failed
      </span>
    </div>
  );
}

// ── Log row ───────────────────────────────────────────────────────────────────

interface LogRowProps {
  entry: EmailLogEntry;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
}

function LogRow({ entry, isExpanded, onToggleExpand }: LogRowProps): ReactElement {
  return (
    <div
      className="rounded-lg border border-[var(--grey-100)] bg-[var(--surface-card)]"
      style={{ borderLeftWidth: '4px', borderLeftColor: statusBorderColor(entry.status) }}
    >
      <div className="flex min-w-0 items-center gap-3 px-4 py-3">
        {/* Status badge */}
        <span className="shrink-0 text-xs font-medium text-[var(--text-secondary)]">
          {statusLabel(entry.status)}
        </span>

        {/* Template type */}
        <span className="shrink-0 rounded bg-[var(--grey-50)] px-2 py-0.5 text-xs text-[var(--text-secondary)]">
          {templateLabel(entry.templateType)}
        </span>

        {/* Recipient */}
        <span
          className="min-w-0 max-w-[180px] shrink-0 truncate text-sm text-[var(--text-primary)]"
          title={entry.recipient}
        >
          {entry.recipient}
        </span>

        {/* Subject */}
        <span className="min-w-0 flex-1 truncate text-sm text-[var(--text-secondary)]" title={entry.subject}>
          {entry.subject}
        </span>

        {/* Sent at */}
        <span className="shrink-0 whitespace-nowrap text-xs text-[var(--text-secondary)]">
          {formatSentAt(entry.sentAt)}
        </span>

        {/* Error expand toggle — only for failed rows */}
        {entry.status === 'failed' && entry.error !== null && (
          <button
            type="button"
            onClick={() => onToggleExpand(entry.id)}
            className="shrink-0 rounded px-2 py-1 text-xs text-[var(--feedback-error-text)] hover:bg-[var(--grey-50)]"
            aria-expanded={isExpanded}
            aria-label="Toggle error details"
          >
            {isExpanded ? 'Hide error' : 'Show error'}
          </button>
        )}
      </div>

      {/* Expanded error */}
      {isExpanded && entry.error !== null && (
        <div className="border-t border-[var(--grey-100)] bg-[var(--grey-50)] px-4 py-3">
          <p className="break-words font-mono text-xs text-[var(--feedback-error-text)]">
            {entry.error}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export function EmailLogPage(): ReactElement {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [templateFilter, setTemplateFilter] = useState<TemplateFilter>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const { data: entries = [], isLoading } = useEmailLog({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    templateType: templateFilter !== 'all' ? templateFilter : undefined,
  });

  const handleToggleExpand = useCallback((id: string): void => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleStatusSelect = useCallback((id: string): void => {
    setStatusFilter(id as StatusFilter);
  }, []);

  const handleTemplateSelect = useCallback((id: string): void => {
    setTemplateFilter(id as TemplateFilter);
  }, []);

  return (
    <div>
      {/* Page heading */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--grey-900)]">Email Log</h1>
      </div>

      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <PillTabNav
          tabs={[...STATUS_TABS]}
          activeId={statusFilter}
          onSelect={handleStatusSelect}
          ariaLabel="Filter by status"
          idPrefix="status-filter"
        />
        <PillTabNav
          tabs={[...TEMPLATE_TABS]}
          activeId={templateFilter}
          onSelect={handleTemplateSelect}
          ariaLabel="Filter by template type"
          idPrefix="template-filter"
        />
      </div>

      {/* Summary chips */}
      {!isLoading && <SummaryChips entries={entries} />}

      {/* Loading */}
      {isLoading && <SkeletonRows />}

      {/* Empty state */}
      {!isLoading && entries.length === 0 && (
        <div className="rounded-lg border border-[var(--grey-100)] bg-[var(--surface-card)] py-12 text-center">
          <p className="text-sm text-[var(--text-secondary)]">No email activity yet.</p>
        </div>
      )}

      {/* Log table */}
      {!isLoading && entries.length > 0 && (
        <div className="flex flex-col gap-2">
          {entries.map((entry) => (
            <LogRow
              key={entry.id}
              entry={entry}
              isExpanded={expandedIds.has(entry.id)}
              onToggleExpand={handleToggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
}
