/**
 * Report list item card. Displays format, date, size, page count, and download.
 * Ready reports have a green left border (#2E7D32). Failed reports show inline error.
 */

import type { ReactElement } from 'react';
import { Download, Loader2, AlertCircle } from 'lucide-react';
import type { ReportStatus } from '@compass/types';

interface ReportCardProps {
  report: ReportStatus;
  /** Whether this card is selected in the preview panel */
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  /** Whether the current user can only download (not delete) */
  canDelete: boolean;
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
    <span className="inline-flex items-center rounded-full bg-[var(--grey-50)] px-2 py-0.5 text-xs font-medium uppercase text-[#616161]">
      {format}
    </span>
  );
}

export function ReportCard({
  report,
  isSelected,
  onSelect,
  onDelete,
  canDelete,
}: ReportCardProps): ReactElement {
  const isReady = report.status === 'complete';
  const isFailed = report.status === 'failed';
  const isInProgress = report.status === 'queued' || report.status === 'generating';

  const leftBorderColor = isReady
    ? 'border-l-[#2E7D32]'
    : isFailed
      ? 'border-l-[#D32F2F]'
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
        isSelected ? 'ring-2 ring-[#0A3B4F]' : 'hover:bg-[#FAFAFA]',
      ].join(' ')}
    >
      {/* Top row: format badge + date */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FormatBadge format={report.format} />
          <span className="text-sm text-[var(--grey-500)]">{formatDate(report.createdAt)}</span>
        </div>

        <div className="flex items-center gap-2">
          {canDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              aria-label="Delete report"
              className="rounded-md p-1 text-[var(--grey-400)] hover:bg-[var(--grey-50)] hover:text-[#D32F2F]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Bottom row: metadata */}
      <div className="mt-2 flex items-center gap-4 text-xs text-[var(--grey-400)]">
        {isReady && (
          <>
            <span>{formatFileSize(report.fileSize)}</span>
            {report.pageCount !== null && <span>{report.pageCount} pages</span>}
            <span className="flex items-center gap-1 text-[#2E7D32]">
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
          <span className="flex items-center gap-1 text-[#D32F2F]">
            <AlertCircle size={12} aria-hidden="true" />
            {report.error ?? 'Generation failed'}
          </span>
        )}
      </div>
    </button>
  );
}
