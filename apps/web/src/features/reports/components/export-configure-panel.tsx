/**
 * Configure state panel for the export modal.
 * Format selection, section checkboxes, page estimate, and error display.
 */

import type { ReactElement } from 'react';
import { AlertCircle } from 'lucide-react';
import { ReportFormat, type ReportSection } from '@compass/types';
import { FORMAT_DESCRIPTIONS } from './export-modal-utils';

const FORMAT_OPTIONS: Array<{ value: ReportFormat; label: string }> = [
  { value: ReportFormat.PDF, label: 'PDF' },
  { value: ReportFormat.DOCX, label: 'DOCX' },
  { value: ReportFormat.PPTX, label: 'PPTX' },
];

interface ExportConfigurePanelProps {
  format: ReportFormat;
  onFormatChange: (format: ReportFormat) => void;
  sections: ReportSection[];
  onToggleSection: (sectionId: string) => void;
  estimatedPages: number;
  generationError: string | null;
}

export function ExportConfigurePanel({
  format,
  onFormatChange,
  sections,
  onToggleSection,
  estimatedPages,
  generationError,
}: ExportConfigurePanelProps): ReactElement {
  return (
    <div className="flex flex-col gap-6">
      {/* Format selection */}
      <fieldset>
        <legend className="mb-1 text-sm font-medium text-[var(--grey-700)]">
          Output Format
        </legend>
        <p className="mb-3 text-xs text-[var(--text-tertiary)]">
          Choose how your report will be delivered
        </p>
        <div className="flex flex-col gap-2">
          {FORMAT_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-3 rounded-md border border-[var(--grey-100)] px-4 py-3 transition-colors hover:bg-[var(--grey-50)]"
            >
              <input
                type="radio"
                name="report-format"
                value={option.value}
                checked={format === option.value}
                onChange={() => onFormatChange(option.value)}
                className="h-4 w-4 text-[var(--color-core-text)] focus:ring-[var(--color-core-text)]"
              />
              <div className="flex flex-col">
                <span className="text-sm text-[var(--grey-700)]">{option.label}</span>
                <span className="text-xs text-[var(--text-tertiary)]">
                  {FORMAT_DESCRIPTIONS[option.value]}
                </span>
              </div>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Section selection */}
      <fieldset>
        <legend className="mb-1 text-sm font-medium text-[var(--grey-700)]">
          Report Sections
        </legend>
        <p className="mb-3 text-xs text-[var(--text-tertiary)]">
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
                onChange={() => onToggleSection(section.id)}
                className="h-4 w-4 rounded text-[var(--color-core-text)] focus:ring-[var(--color-core-text)]"
              />
              <span
                className={`text-sm ${section.locked ? 'text-[var(--text-tertiary)]' : 'text-[var(--grey-700)]'}`}
              >
                {section.label}
                {section.locked && (
                  <span className="ml-2 text-xs text-[var(--text-tertiary)]">(required)</span>
                )}
              </span>
            </label>
          ))}
        </div>

        {/* Estimated page count */}
        <p className="mt-3 text-xs text-[var(--text-tertiary)]">
          Estimated length: ~{estimatedPages} pages
        </p>
      </fieldset>

      {/* Generation error from previous attempt */}
      {generationError !== null && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md bg-[var(--severity-critical-bg)] px-3 py-2 text-sm text-[var(--severity-critical-text)]"
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          {generationError}
        </div>
      )}
    </div>
  );
}
