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
import { X } from 'lucide-react';
import {
  ReportFormat,
  getDefaultReportSections,
  type ReportSection,
  type ReportConfig,
} from '@compass/types';
import { useFocusTrap } from '../../../hooks/use-focus-trap';
import { useReportGeneration } from '../hooks/use-report-generation';
import type { ModalState } from './export-modal-utils';
import { getCurrentStep, estimatePageCount, buildFilename } from './export-modal-utils';
import { ExportConfigurePanel } from './export-configure-panel';
import { ExportGeneratingPanel } from './export-generating-panel';
import { ExportCompletePanel } from './export-complete-panel';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  surveyId: string;
  /** Survey name shown in the modal header for context */
  surveyName?: string;
  /** Called after a successful generation to refresh the reports list */
  onGenerated?: () => void;
}

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
        aria-hidden={!isOpen}
        inert={!isOpen ? true : undefined}
        onKeyDown={handleKeyDown}
        className={[
          'fixed z-50 flex flex-col bg-[var(--grey-50)] shadow-lg transition-[transform,visibility] duration-300 ease-in-out',
          // Mobile: bottom sheet
          'inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl lg:inset-x-auto',
          // Desktop: side sheet
          'lg:inset-y-0 lg:right-0 lg:w-[420px] lg:max-h-none lg:rounded-none',
          // Transform + visibility
          isOpen
            ? 'visible translate-y-0 lg:translate-x-0'
            : 'invisible translate-y-full lg:translate-y-0 lg:translate-x-full',
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
              <p className="mt-0.5 text-sm text-[var(--text-secondary)]">{surveyName}</p>
            )}
          </div>
          {modalState !== 'generating' && (
            <button
              type="button"
              onClick={handleClose}
              className="rounded-md p-1 text-[var(--text-secondary)] hover:bg-[var(--grey-50)] hover:text-[var(--grey-700)]"
              aria-label="Close export modal"
            >
              <X size={20} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {modalState === 'configure' && (
            <ExportConfigurePanel
              format={format}
              onFormatChange={setFormat}
              sections={sections}
              onToggleSection={toggleSection}
              estimatedPages={estimatedPages}
              generationError={generation.error}
            />
          )}

          {modalState === 'generating' && (
            <ExportGeneratingPanel
              progress={generation.progress}
              currentStep={currentStep}
            />
          )}

          {modalState === 'complete' && (
            <ExportCompletePanel
              filename={filename}
              format={format}
              fileUrl={generation.fileUrl}
              fileSize={generation.fileSize}
              pageCount={generation.pageCount}
              generationStatus={generation.status}
              generationError={generation.error}
              linkCopied={linkCopied}
              onCopyLink={() => void handleCopyLink()}
              onNewExport={handleNewExport}
              onReset={generation.reset}
            />
          )}

          {/* Generation failure in generating state */}
          {generation.status === 'failed' && modalState === 'generating' && (
            <div className="mt-4 flex flex-col items-center gap-3 text-center">
              <span className="text-sm text-[var(--severity-critical-text)]">
                {generation.error ?? 'Report generation failed.'}
              </span>
              <button
                type="button"
                onClick={generation.reset}
                className="text-sm font-medium text-[var(--color-interactive)] underline hover:no-underline"
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
                className="flex-1 rounded-md border border-[var(--grey-100)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--grey-50)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleGenerate()}
                disabled={sections.filter((s) => s.included).length === 0}
                className="flex-1 rounded-md bg-[var(--color-interactive)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--color-interactive)] focus:ring-offset-2 disabled:opacity-50"
              >
                Generate Report
              </button>
            </div>
          )}

          {modalState === 'generating' && (
            <p className="text-center text-xs text-[var(--text-tertiary)]">
              Please wait while your report is being generated.
            </p>
          )}

          {modalState === 'complete' && (
            <button
              type="button"
              onClick={handleDone}
              className="w-full rounded-md border border-[var(--grey-100)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--grey-50)]"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </>
  );
}
