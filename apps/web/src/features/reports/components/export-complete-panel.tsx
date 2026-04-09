/**
 * Complete state panel for the export modal.
 * Success indicator, file card with metadata, and download/copy/new-export actions.
 */

import type { ReactElement } from 'react';
import { Download, CheckCircle2, AlertCircle, FileText, Copy, Plus } from 'lucide-react';
import { ReportFormat } from '@compass/types';
import { formatFileSize } from './export-modal-utils';

interface ExportCompletePanelProps {
  filename: string;
  format: ReportFormat;
  fileUrl: string | null;
  fileSize: number | null;
  pageCount: number | null;
  generationStatus: string | null;
  generationError: string | null;
  linkCopied: boolean;
  onCopyLink: () => void;
  onNewExport: () => void;
  onReset: () => void;
}

export function ExportCompletePanel({
  filename,
  format,
  fileUrl,
  fileSize,
  pageCount,
  generationStatus,
  generationError,
  linkCopied,
  onCopyLink,
  onNewExport,
  onReset,
}: ExportCompletePanelProps): ReactElement {
  return (
    <>
      <div className="flex flex-col items-center gap-5 py-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--severity-healthy-bg)]">
          <CheckCircle2 size={32} className="text-[var(--severity-healthy-text)]" aria-hidden="true" />
        </div>
        <h3 className="text-lg font-semibold text-[var(--grey-900)]">Report Ready</h3>

        {/* File card */}
        <div className="w-full rounded-lg border border-[var(--grey-100)] bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[var(--grey-50)]">
              <FileText size={20} className="text-[var(--text-secondary)]" aria-hidden="true" />
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium text-[var(--grey-700)]">
                {filename}
              </span>
              <span className="text-xs text-[var(--text-tertiary)]">
                {fileSize !== null && formatFileSize(fileSize)}
                {fileSize !== null && pageCount !== null && ' · '}
                {pageCount !== null &&
                  `${pageCount} page${pageCount !== 1 ? 's' : ''}`}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex w-full flex-col gap-2">
          {fileUrl !== null && (
            <a
              href={fileUrl}
              download={filename}
              className="flex items-center justify-center gap-2 rounded-md bg-[var(--color-interactive)] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--color-interactive)] focus:ring-offset-2"
            >
              <Download size={16} aria-hidden="true" />
              Download {format.toUpperCase()}
            </a>
          )}
          {fileUrl !== null && (
            <button
              type="button"
              onClick={onCopyLink}
              className="flex items-center justify-center gap-2 rounded-md border border-[var(--grey-100)] px-6 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--grey-50)]"
            >
              <Copy size={16} aria-hidden="true" />
              {linkCopied ? 'Link Copied' : 'Copy Share Link'}
            </button>
          )}
          <button
            type="button"
            onClick={onNewExport}
            className="flex items-center justify-center gap-2 rounded-md border border-[var(--grey-100)] px-6 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--grey-50)]"
          >
            <Plus size={16} aria-hidden="true" />
            New Export
          </button>
        </div>
      </div>

      {/* Generation failure in generating state */}
      {generationStatus === 'failed' && (
        <div className="mt-4 flex flex-col items-center gap-3 text-center">
          <AlertCircle size={32} className="text-[var(--severity-critical-text)]" aria-hidden="true" />
          <p className="text-sm text-[var(--severity-critical-text)]">
            {generationError ?? 'Report generation failed.'}
          </p>
          <button
            type="button"
            onClick={onReset}
            className="text-sm font-medium text-[var(--color-interactive)] underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      )}
    </>
  );
}
