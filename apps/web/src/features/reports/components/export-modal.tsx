/**
 * Export modal for generating a new report.
 * Mobile: bottom sheet with drag handle and scrim.
 * Desktop: 420px side sheet on the right with scrim.
 *
 * Three states:
 * 1. Configuration — format + section selection
 * 2. Generating — progress bar with step indicators and spinner
 * 3. Complete — file card with metadata, download, copy link, new export
 *
 * Focus trap is active while the modal is open. Escape closes.
 */

import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { X, Download, CheckCircle2, AlertCircle, FileText, Copy, Plus } from 'lucide-react';
import {
  ReportFormat,
  getDefaultReportSections,
  type ReportSection,
  type ReportConfig,
} from '@compass/types';
import { useReportGeneration } from '../hooks/use-report-generation';

// ─── Focus Trap ─────────────────────────────────────────────────────────────

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input:not([disabled]), select, [tabindex]:not([tabindex="-1"])';

function useFocusTrap(
  containerRef: React.RefObject<HTMLElement | null>,
  isActive: boolean,
): void {
  useEffect(() => {
    if (!isActive) return;
    const container = containerRef.current;
    if (container === null) return;

    const firstFocusable = container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    firstFocusable?.focus();

    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key !== 'Tab' || container === null) return;
      const focusables = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusables.length === 0) return;

      const first = focusables[0] as HTMLElement | undefined;
      const last = focusables[focusables.length - 1] as HTMLElement | undefined;
      if (first === undefined || last === undefined) return;

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [containerRef, isActive]);
}

// ─── Types ──────────────────────────────────────────────────────────────────

type ModalState = 'configure' | 'generating' | 'complete';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  surveyId: string;
  /** Survey name shown in the modal header for context */
  surveyName?: string;
  /** Called after a successful generation to refresh the reports list */
  onGenerated?: () => void;
}

// ─── Generation Steps ───────────────────────────────────────────────────────

const GENERATION_STEPS = [
  { threshold: 0, label: 'Queued' },
  { threshold: 20, label: 'Assembling data' },
  { threshold: 50, label: 'Rendering report' },
  { threshold: 80, label: 'Finalizing' },
  { threshold: 100, label: 'Complete' },
] as const;

function getCurrentStep(progress: number): number {
  let step = 0;
  for (let i = GENERATION_STEPS.length - 1; i >= 0; i--) {
    if (progress >= GENERATION_STEPS[i]!.threshold) {
      step = i;
      break;
    }
  }
  return step;
}

// ─── Format Descriptions ────────────────────────────────────────────────────

const FORMAT_DESCRIPTIONS: Record<string, string> = {
  [ReportFormat.PDF]: 'Best for printing and sharing',
  [ReportFormat.PPTX]: 'Best for presentations',
};

// ─── Section Page Estimates ─────────────────────────────────────────────────

/** Approximate page counts per section for the estimated page count display */
const SECTION_PAGE_ESTIMATES: Record<string, number> = {
  cover: 1,
  executive_summary: 2,
  compass_overview: 2,
  dimension_deep_dives: 6,
  segment_analysis: 4,
  recommendations: 3,
};

function estimatePageCount(sections: ReportSection[]): number {
  return sections
    .filter((s) => s.included)
    .reduce((total, s) => total + (SECTION_PAGE_ESTIMATES[s.id] ?? 1), 0);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Format bytes into a readable file size string */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Build a filename from format and survey name */
function buildFilename(format: ReportFormat, surveyName?: string): string {
  const base = surveyName ? surveyName.replace(/\s+/g, '-').toLowerCase() : 'report';
  return `${base}-report.${format}`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ExportModal({
  isOpen,
  onClose,
  surveyId,
  surveyName,
  onGenerated,
}: ExportModalProps): ReactElement {
  const modalRef = useRef<HTMLDivElement>(null);
  const [format, setFormat] = useState<ReportFormat>(ReportFormat.PDF);
  const [sections, setSections] = useState<ReportSection[]>(getDefaultReportSections);
  const [linkCopied, setLinkCopied] = useState(false);

  const generation = useReportGeneration();

  // Derive modal state from generation status
  const modalState: ModalState =
    generation.status === 'completed'
      ? 'complete'
      : generation.isGenerating
        ? 'generating'
        : 'configure';

  useFocusTrap(modalRef, isOpen);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  // Escape to close (only in configure state)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent): void => {
      if (e.key === 'Escape' && modalState === 'configure') {
        onClose();
      }
    },
    [onClose, modalState],
  );

  /** Reset local state when modal closes */
  const handleClose = useCallback((): void => {
    if (modalState === 'generating') return; // Prevent closing during generation
    generation.reset();
    setFormat(ReportFormat.PDF);
    setSections(getDefaultReportSections());
    setLinkCopied(false);
    onClose();
  }, [modalState, generation, onClose]);

  /** Handle close after completion */
  const handleDone = useCallback((): void => {
    onGenerated?.();
    handleClose();
  }, [onGenerated, handleClose]);

  /** Reset to configure state for a new export */
  const handleNewExport = useCallback((): void => {
    generation.reset();
    setFormat(ReportFormat.PDF);
    setSections(getDefaultReportSections());
    setLinkCopied(false);
  }, [generation]);

  /** Copy the file URL to clipboard */
  const handleCopyLink = useCallback(async (): Promise<void> => {
    if (generation.fileUrl === null) return;
    try {
      await navigator.clipboard.writeText(generation.fileUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // Clipboard API may fail in insecure contexts — no-op
    }
  }, [generation.fileUrl]);

  /** Toggle a section's included state */
  const toggleSection = useCallback((sectionId: string): void => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId && !s.locked ? { ...s, included: !s.included } : s,
      ),
    );
  }, []);

  /** Start generation */
  const handleGenerate = useCallback(async (): Promise<void> => {
    const config: ReportConfig = {
      surveyId,
      format,
      sections,
    };
    await generation.generate(config);
  }, [surveyId, format, sections, generation]);

  const currentStep = getCurrentStep(generation.progress);
  const estimatedPages = estimatePageCount(sections);
  const filename = buildFilename(format, surveyName);

  return (
    <>
      {/* Scrim */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={modalState === 'configure' ? handleClose : undefined}
        aria-hidden="true"
      />

      {/* Modal — mobile: bottom sheet, desktop: 420px side sheet */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Export report"
        onKeyDown={handleKeyDown}
        className={[
          'fixed z-50 flex flex-col bg-[var(--grey-50)] shadow-lg transition-transform duration-300 ease-in-out',
          // Mobile: bottom sheet
          'inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl lg:inset-x-auto',
          // Desktop: side sheet
          'lg:inset-y-0 lg:right-0 lg:w-[420px] lg:max-h-none lg:rounded-none',
          // Transform
          isOpen
            ? 'translate-y-0 lg:translate-x-0'
            : 'translate-y-full lg:translate-y-0 lg:translate-x-full',
        ].join(' ')}
      >
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 lg:hidden">
          <div className="h-1 w-10 rounded-full bg-[var(--grey-100)]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--grey-100)] px-6 py-4">
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold text-[var(--grey-900)]">Export Report</h2>
            {surveyName && (
              <p className="mt-0.5 text-sm text-[var(--grey-500)]">{surveyName}</p>
            )}
          </div>
          {modalState !== 'generating' && (
            <button
              type="button"
              onClick={handleClose}
              className="rounded-md p-1 text-[var(--grey-500)] hover:bg-[var(--grey-50)] hover:text-[var(--grey-700)]"
              aria-label="Close export modal"
            >
              <X size={20} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* ── Configure State ── */}
          {modalState === 'configure' && (
            <div className="flex flex-col gap-6">
              {/* Format selection */}
              <fieldset>
                <legend className="mb-1 text-sm font-medium text-[var(--grey-700)]">
                  Output Format
                </legend>
                <p className="mb-3 text-xs text-[var(--grey-400)]">
                  Choose how your report will be delivered
                </p>
                <div className="flex flex-col gap-2">
                  <label className="flex cursor-pointer items-center gap-3 rounded-md border border-[var(--grey-100)] px-4 py-3 transition-colors hover:bg-[var(--grey-50)]">
                    <input
                      type="radio"
                      name="report-format"
                      value={ReportFormat.PDF}
                      checked={format === ReportFormat.PDF}
                      onChange={() => setFormat(ReportFormat.PDF)}
                      className="h-4 w-4 text-[var(--color-core-text)] focus:ring-[var(--color-core-text)]"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm text-[var(--grey-700)]">PDF</span>
                      <span className="text-xs text-[var(--grey-400)]">
                        {FORMAT_DESCRIPTIONS[ReportFormat.PDF]}
                      </span>
                    </div>
                  </label>
                  <label className="flex cursor-not-allowed items-center gap-3 rounded-md border border-[var(--grey-100)] px-4 py-3 opacity-50">
                    <input
                      type="radio"
                      name="report-format"
                      value={ReportFormat.PPTX}
                      disabled
                      className="h-4 w-4"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm text-[var(--grey-400)]">
                        PPTX
                        <span className="ml-2 rounded bg-[var(--grey-50)] px-1.5 py-0.5 text-xs text-[var(--grey-400)]">
                          Coming soon
                        </span>
                      </span>
                      <span className="text-xs text-[var(--grey-300)]">
                        {FORMAT_DESCRIPTIONS[ReportFormat.PPTX]}
                      </span>
                    </div>
                  </label>
                </div>
              </fieldset>

              {/* Section selection */}
              <fieldset>
                <legend className="mb-1 text-sm font-medium text-[var(--grey-700)]">
                  Report Sections
                </legend>
                <p className="mb-3 text-xs text-[var(--grey-400)]">
                  Select which sections to include in your report
                </p>
                <div className="flex flex-col gap-2">
                  {sections.map((section) => (
                    <label
                      key={section.id}
                      className={[
                        'flex items-center gap-3 rounded-md border border-[var(--grey-100)] px-4 py-3 transition-colors',
                        section.locked
                          ? 'cursor-default bg-[var(--grey-50)]'
                          : 'cursor-pointer hover:bg-[var(--grey-50)]',
                      ].join(' ')}
                    >
                      <input
                        type="checkbox"
                        checked={section.included}
                        disabled={section.locked}
                        onChange={() => toggleSection(section.id)}
                        className="h-4 w-4 rounded text-[var(--color-core-text)] focus:ring-[var(--color-core-text)]"
                      />
                      <span
                        className={`text-sm ${section.locked ? 'text-[var(--grey-400)]' : 'text-[var(--grey-700)]'}`}
                      >
                        {section.label}
                        {section.locked && (
                          <span className="ml-2 text-xs text-[var(--grey-300)]">(required)</span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>

                {/* Estimated page count */}
                <p className="mt-3 text-xs text-[var(--grey-400)]">
                  Estimated length: ~{estimatedPages} pages
                </p>
              </fieldset>

              {/* Generation error from previous attempt */}
              {generation.error !== null && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-md bg-[var(--severity-critical-bg)] px-3 py-2 text-sm text-[var(--severity-critical-text)]"
                >
                  <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                  {generation.error}
                </div>
              )}
            </div>
          )}

          {/* ── Generating State ── */}
          {modalState === 'generating' && (
            <div className="flex flex-col gap-6">
              {/* Circular spinner */}
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="relative h-20 w-20">
                  {/* Background circle */}
                  <svg className="h-20 w-20" viewBox="0 0 80 80">
                    <circle
                      cx="40"
                      cy="40"
                      r="34"
                      fill="none"
                      stroke="var(--grey-100)"
                      strokeWidth="6"
                    />
                    {/* Progress arc */}
                    <circle
                      cx="40"
                      cy="40"
                      r="34"
                      fill="none"
                      stroke="var(--color-core-text)"
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 34}`}
                      strokeDashoffset={`${2 * Math.PI * 34 * (1 - generation.progress / 100)}`}
                      className="transition-[stroke-dashoffset] duration-500 ease-out"
                      transform="rotate(-90 40 40)"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-[var(--grey-700)]">
                    {generation.progress}%
                  </span>
                </div>
                <span className="text-sm font-medium text-[var(--grey-700)]">
                  Generating report
                </span>
              </div>

              {/* Step indicators */}
              <ol className="flex flex-col gap-3">
                {GENERATION_STEPS.map((step, index) => {
                  const isActive = index === currentStep;
                  const isDone = index < currentStep;

                  return (
                    <li key={step.label} className="flex items-center gap-3">
                      <div
                        className={[
                          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs',
                          isDone
                            ? 'bg-[var(--severity-healthy-text)] text-white'
                            : isActive
                              ? 'bg-[var(--color-core)] text-white'
                              : 'bg-[var(--grey-50)] text-[var(--grey-300)]',
                        ].join(' ')}
                      >
                        {isDone ? (
                          <CheckCircle2 size={14} aria-hidden="true" />
                        ) : isActive ? (
                          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        ) : (
                          <span>{index + 1}</span>
                        )}
                      </div>
                      <span
                        className={`text-sm ${
                          isDone
                            ? 'text-[var(--severity-healthy-text)]'
                            : isActive
                              ? 'font-medium text-[var(--grey-700)]'
                              : 'text-[var(--grey-300)]'
                        }`}
                      >
                        {step.label}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          {/* ── Complete State ── */}
          {modalState === 'complete' && (
            <div className="flex flex-col items-center gap-5 py-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--severity-healthy-bg)]">
                <CheckCircle2 size={32} className="text-[var(--severity-healthy-text)]" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--grey-900)]">Report Ready</h3>

              {/* File card */}
              <div className="w-full rounded-lg border border-[var(--grey-100)] bg-white px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[var(--grey-50)]">
                    <FileText size={20} className="text-[var(--grey-500)]" aria-hidden="true" />
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium text-[var(--grey-700)]">
                      {filename}
                    </span>
                    <span className="text-xs text-[var(--grey-400)]">
                      {generation.fileSize !== null && formatFileSize(generation.fileSize)}
                      {generation.fileSize !== null && generation.pageCount !== null && ' · '}
                      {generation.pageCount !== null &&
                        `${generation.pageCount} page${generation.pageCount !== 1 ? 's' : ''}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex w-full flex-col gap-2">
                {generation.fileUrl !== null && (
                  <a
                    href={generation.fileUrl}
                    download={filename}
                    className="flex items-center justify-center gap-2 rounded-md bg-[var(--color-core)] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--color-core-text)] focus:ring-offset-2"
                  >
                    <Download size={16} aria-hidden="true" />
                    Download {format.toUpperCase()}
                  </a>
                )}
                {generation.fileUrl !== null && (
                  <button
                    type="button"
                    onClick={() => void handleCopyLink()}
                    className="flex items-center justify-center gap-2 rounded-md border border-[var(--grey-100)] px-6 py-2.5 text-sm font-medium text-[var(--grey-500)] transition-colors hover:bg-[var(--grey-50)]"
                  >
                    <Copy size={16} aria-hidden="true" />
                    {linkCopied ? 'Link Copied' : 'Copy Share Link'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleNewExport}
                  className="flex items-center justify-center gap-2 rounded-md border border-[var(--grey-100)] px-6 py-2.5 text-sm font-medium text-[var(--grey-500)] transition-colors hover:bg-[var(--grey-50)]"
                >
                  <Plus size={16} aria-hidden="true" />
                  New Export
                </button>
              </div>
            </div>
          )}

          {/* Generation failure in generating state */}
          {generation.status === 'failed' && modalState !== 'configure' && (
            <div className="mt-4 flex flex-col items-center gap-3 text-center">
              <AlertCircle size={32} className="text-[var(--severity-critical-text)]" aria-hidden="true" />
              <p className="text-sm text-[var(--severity-critical-text)]">
                {generation.error ?? 'Report generation failed.'}
              </p>
              <button
                type="button"
                onClick={generation.reset}
                className="text-sm font-medium text-[var(--color-core-text)] underline hover:no-underline"
              >
                Try again
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--grey-100)] px-6 py-4">
          {modalState === 'configure' && (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 rounded-md border border-[var(--grey-100)] px-4 py-2.5 text-sm font-medium text-[var(--grey-500)] transition-colors hover:bg-[var(--grey-50)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleGenerate()}
                disabled={sections.filter((s) => s.included).length === 0}
                className="flex-1 rounded-md bg-[var(--color-core)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--color-core-text)] focus:ring-offset-2 disabled:opacity-50"
              >
                Generate Report
              </button>
            </div>
          )}

          {modalState === 'generating' && (
            <p className="text-center text-xs text-[var(--grey-400)]">
              Please wait while your report is being generated.
            </p>
          )}

          {modalState === 'complete' && (
            <button
              type="button"
              onClick={handleDone}
              className="w-full rounded-md border border-[var(--grey-100)] px-4 py-2.5 text-sm font-medium text-[var(--grey-500)] transition-colors hover:bg-[var(--grey-50)]"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </>
  );
}
