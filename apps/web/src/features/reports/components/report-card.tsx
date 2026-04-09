/**
 * Report list item card. Displays format, date, size, page count, and download.
 * Ready reports have a green left border (#2E7D32). Failed reports show inline error.
 * Download button is always visible on ready reports (critical for mobile access).
 */

import type { ReactElement } from 'react';
import { Download, Loader2, AlertCircle } from 'lucide-react';
import type { ReportStatus } from '@compass/types';

interface ReportCardProps {
  report: ReportStatus;
  /** Whether this card is selected in the preview panel */
  isSelected: boolean;
  onSelect: () => void;
}

/** Format bytes into a readable string */
function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === 0) return '--';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Format ISO date to readable string */
function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Map report format to display badge */
function FormatBadge({ format }: { format: string }): ReactElement {
  return (
    <span className="inline-flex items-center rounded-full bg-[var(--grey-50)] px-2 py-0.5 text-xs font-medium uppercase text-[var(--text-secondary)]">
      {format}
    </span>
  );
}

export function ReportCard({
  report,
  isSelected,
  onSelect,
}: ReportCardProps): ReactElement {
  const isReady = report.status === 'completed';
  const isFailed = report.status === 'failed';
  const isInProgress = report.status === 'queued' || report.status === 'generating';

  const leftBorderColor = isReady
    ? 'border-l-[var(--severity-healthy-border)]'
    : isFailed
      ? 'border-l-[var(--severity-critical-border)]'
      : 'border-l-transparent';

  return (
    <div
      role="group"
      aria-label={`Report generated ${formatDate(report.createdAt)}, format ${report.format.toUpperCase()}, ${report.status}`}
      aria-current={isSelected ? 'true' : undefined}
      className={[
        'relative w-full rounded-lg border border-[var(--grey-100)] border-l-4 bg-[var(--surface-card)] p-4 text-left transition-colors',
        leftBorderColor,
        isSelected ? 'ring-2 ring-[var(--color-interactive)]' : 'hover:bg-[var(--grey-50)]',
      ].join(' ')}
    >
      {/* Stretched overlay for primary click target */}
      <button
        type="button"
        onClick={onSelect}
        className="absolute inset-0 z-0 cursor-pointer rounded-lg"
        aria-label={`Select report from ${formatDate(report.createdAt)}`}
      />

      {/* Top row: format badge + date + download */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FormatBadge format={report.format} />
          <span className="text-sm text-[var(--text-secondary)]">{formatDate(report.createdAt)}</span>
        </div>

        {isReady && report.fileUrl !== null && (
          <a
            href={report.fileUrl}
            download
            onClick={(e) => e.stopPropagation()}
            aria-label={`Download ${report.format.toUpperCase()} report`}
            className="relative z-10 rounded-md p-1.5 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--grey-100)] hover:text-[var(--color-interactive)]"
          >
            <Download size={16} aria-hidden="true" />
          </a>
        )}
      </div>

      {/* Bottom row: metadata */}
      <div className="mt-2 flex items-center gap-4 text-xs text-[var(--text-tertiary)]">
        {isReady && (
          <>
            <span>{formatFileSize(report.fileSize)}</span>
            {report.pageCount !== null && <span>{report.pageCount} pages</span>}
            <span className="flex items-center gap-1 text-[var(--severity-healthy-text)]">
              <Download size={12} aria-hidden="true" />
              Ready
            </span>
          </>
        )}

        {isInProgress && (
          <span className="flex items-center gap-1 text-[var(--text-secondary)]">
            <Loader2 size={12} className="animate-spin" aria-hidden="true" />
            Generating ({report.progress}%)
          </span>
        )}

        {isFailed && (
          <span className="flex items-center gap-1 text-[var(--severity-critical-text)]">
            <AlertCircle size={12} aria-hidden="true" />
            {report.error ?? 'Generation failed'}
          </span>
        )}
      </div>
    </div>
  );
}
