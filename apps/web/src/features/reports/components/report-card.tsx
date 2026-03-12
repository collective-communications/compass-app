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
    <span className="inline-flex items-center rounded-full bg-[var(--grey-50)] px-2 py-0.5 text-xs font-medium uppercase text-[var(--grey-500)]">
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
    <button
      type="button"
      onClick={onSelect}
      aria-selected={isSelected}
      aria-label={`Report generated ${formatDate(report.createdAt)}, format ${report.format.toUpperCase()}, ${report.status}`}
      className={[
        'w-full rounded-lg border border-[var(--grey-100)] border-l-4 bg-[var(--grey-50)] p-4 text-left transition-colors',
        leftBorderColor,
        isSelected ? 'ring-2 ring-[var(--color-core)]' : 'hover:bg-[var(--grey-50)]',
      ].join(' ')}
    >
      {/* Top row: format badge + date + download */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FormatBadge format={report.format} />
          <span className="text-sm text-[var(--grey-500)]">{formatDate(report.createdAt)}</span>
        </div>

        {isReady && report.fileUrl !== null && (
          <a
            href={report.fileUrl}
            download
            onClick={(e) => e.stopPropagation()}
            aria-label={`Download ${report.format.toUpperCase()} report`}
            className="rounded-md p-1.5 text-[var(--grey-400)] transition-colors hover:bg-[var(--grey-100)] hover:text-[var(--color-core)]"
          >
            <Download size={16} aria-hidden="true" />
          </a>
        )}
      </div>

      {/* Bottom row: metadata */}
      <div className="mt-2 flex items-center gap-4 text-xs text-[var(--grey-400)]">
        {isReady && (
          <>
            <span>{formatFileSize(report.fileSize)}</span>
            {report.pageCount !== null && <span>{report.pageCount} pages</span>}
            <span className="flex items-center gap-1 text-[var(--severity-healthy-border)]">
              <Download size={12} aria-hidden="true" />
              Ready
            </span>
          </>
        )}

        {isInProgress && (
          <span className="flex items-center gap-1 text-[var(--grey-500)]">
            <Loader2 size={12} className="animate-spin" aria-hidden="true" />
            Generating ({report.progress}%)
          </span>
        )}

        {isFailed && (
          <span className="flex items-center gap-1 text-[var(--severity-critical-border)]">
            <AlertCircle size={12} aria-hidden="true" />
            {report.error ?? 'Generation failed'}
          </span>
        )}
      </div>
    </button>
  );
}
