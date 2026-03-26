/**
 * Report preview panel (desktop 35% right column).
 * Shows selected report details and download action.
 * Empty state when no report is selected.
 */

import type { ReactElement } from 'react';
import { Download, FileText, Loader2 } from 'lucide-react';
import type { ReportRow } from '../services/report-api';
import { useReportDownload } from '../hooks/use-report-download';

interface ReportPreviewProps {
  report: ReportRow | null;
}

/** Format bytes into a readable string */
function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === 0) return '--';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Map section IDs to readable labels */
const SECTION_LABELS: Record<string, string> = {
  cover: 'Cover Page',
  executive_summary: 'Executive Summary',
  compass_overview: 'Compass Overview',
  dimension_deep_dives: 'Dimension Deep Dives',
  segment_analysis: 'Segment Analysis',
  recommendations: 'Recommendations',
};

export function ReportPreview({ report }: ReportPreviewProps): ReactElement {
  const { isLoading: isDownloading, error: downloadError, printPdf, downloadFile } = useReportDownload();

  if (report === null) {
    return (
      <aside
        aria-label="Report preview"
        className="flex flex-col items-center justify-center gap-3 rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)] p-8 text-center lg:sticky lg:top-6"
      >
        <FileText size={40} className="text-[var(--grey-100)]" aria-hidden="true" />
        <p className="text-sm text-[var(--text-tertiary)]">
          Select a report to preview details
        </p>
      </aside>
    );
  }

  const isReady = report.status === 'completed';

  async function handleDownload(): Promise<void> {
    if (report?.storagePath === null || report?.storagePath === undefined) return;

    if (report.format === 'pdf') {
      await printPdf(report.storagePath);
    } else {
      await downloadFile(report.storagePath, `report.${report.format}`);
    }
  }

  return (
    <aside
      aria-label="Report preview"
      className="flex flex-col gap-4 rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)] p-6 lg:sticky lg:top-6"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-[var(--grey-50)] px-2 py-0.5 text-xs font-medium uppercase text-[var(--text-secondary)]">
          {report.format}
        </span>
        <span
          className={`text-xs font-medium ${
            isReady ? 'text-[var(--severity-healthy-text)]' : report.status === 'failed' ? 'text-[var(--severity-critical-text)]' : 'text-[var(--text-secondary)]'
          }`}
        >
          {report.status === 'completed' ? 'Ready' : report.status === 'failed' ? 'Failed' : 'In progress'}
        </span>
      </div>

      {/* Metadata */}
      <dl className="flex flex-col gap-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-[var(--text-secondary)]">Generated</dt>
          <dd className="text-[var(--grey-700)]">{formatDate(report.createdAt)}</dd>
        </div>
        {report.fileSize !== null && (
          <div className="flex justify-between">
            <dt className="text-[var(--text-secondary)]">File size</dt>
            <dd className="text-[var(--grey-700)]">{formatFileSize(report.fileSize)}</dd>
          </div>
        )}
        {report.pageCount !== null && (
          <div className="flex justify-between">
            <dt className="text-[var(--text-secondary)]">Pages</dt>
            <dd className="text-[var(--grey-700)]">{report.pageCount}</dd>
          </div>
        )}
      </dl>

      {/* Included sections */}
      {report.sections.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
            Included Sections
          </h4>
          <ul className="flex flex-col gap-1">
            {report.sections.map((sectionId) => (
              <li key={sectionId} className="text-sm text-[var(--text-secondary)]">
                {SECTION_LABELS[sectionId] ?? sectionId}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Error detail */}
      {report.status === 'failed' && report.error !== null && (
        <p className="rounded-md bg-[var(--severity-critical-bg)] px-3 py-2 text-xs text-[var(--severity-critical-text)]">
          {report.error}
        </p>
      )}

      {/* Download error */}
      {downloadError !== null && (
        <p className="rounded-md bg-[var(--severity-critical-bg)] px-3 py-2 text-xs text-[var(--severity-critical-text)]">
          {downloadError}
        </p>
      )}

      {/* Download button */}
      {isReady && report.storagePath !== null && (
        <button
          type="button"
          onClick={() => void handleDownload()}
          disabled={isDownloading}
          className="mt-2 flex items-center justify-center gap-2 rounded-md bg-[var(--color-core)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--color-core-text)] focus:ring-offset-2 disabled:opacity-50"
        >
          {isDownloading ? (
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          ) : (
            <Download size={16} aria-hidden="true" />
          )}
          {isDownloading ? 'Preparing...' : `Download ${report.format.toUpperCase()}`}
        </button>
      )}
    </aside>
  );
}
