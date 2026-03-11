/**
 * Bulk import modal for survey recipients.
 * Supports CSV file upload and paste-from-clipboard.
 * Validates emails, detects duplicates, and previews before import.
 */

import { useRef, useEffect, useState, useCallback, type ReactElement, type ChangeEvent } from 'react';
import { parseCsvContent, type ParsedRecipient, type ParsedRow } from '../lib/csv-parser';

export type { ParsedRecipient } from '../lib/csv-parser';

export interface BulkImportModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (recipients: ParsedRecipient[]) => void;
  existingEmails: string[];
  isPending: boolean;
}

export function BulkImportModal({
  open,
  onClose,
  onImport,
  existingEmails,
  isPending,
}: BulkImportModalProps): ReactElement {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pasteContent, setPasteContent] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [inputMethod, setInputMethod] = useState<'file' | 'paste'>('file');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // Reset state when opening
      setPasteContent('');
      setParsedRows([]);
      setInputMethod('file');
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        const content = ev.target?.result as string;
        setParsedRows(parseCsvContent(content, existingEmails));
      };
      reader.readAsText(file);
    },
    [existingEmails],
  );

  const handleParsePaste = useCallback(() => {
    setParsedRows(parseCsvContent(pasteContent, existingEmails));
  }, [pasteContent, existingEmails]);

  const validRows = parsedRows.filter((r) => r.valid);
  const invalidRows = parsedRows.filter((r) => !r.valid);

  const handleImport = useCallback(() => {
    const recipients: ParsedRecipient[] = validRows.map((r) => ({
      email: r.email,
      name: r.name || undefined,
      segmentMetadata: {
        ...(r.department ? { department: r.department } : {}),
        ...(r.role ? { role: r.role } : {}),
        ...(r.location ? { location: r.location } : {}),
        ...(r.tenure ? { tenure: r.tenure } : {}),
      },
    }));
    onImport(recipients);
  }, [validRows, onImport]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="w-full max-w-2xl rounded-lg border border-[var(--grey-100)] bg-white p-0 shadow-lg backdrop:bg-black/40"
    >
      <div className="flex flex-col gap-5 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--grey-900)]">Import Recipients</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-[var(--grey-500)] hover:text-[var(--grey-700)]"
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M15 5L5 15M5 5l10 10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Input method toggle */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setInputMethod('file')}
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              inputMethod === 'file'
                ? 'bg-[var(--grey-900)] text-white'
                : 'text-[var(--grey-600)] hover:text-[var(--grey-900)]'
            }`}
          >
            Upload CSV
          </button>
          <button
            type="button"
            onClick={() => setInputMethod('paste')}
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              inputMethod === 'paste'
                ? 'bg-[var(--grey-900)] text-white'
                : 'text-[var(--grey-600)] hover:text-[var(--grey-900)]'
            }`}
          >
            Paste Data
          </button>
        </div>

        {/* Input area */}
        {inputMethod === 'file' ? (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-[var(--grey-700)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--grey-100)] file:px-4 file:py-2 file:text-sm file:font-medium file:text-[var(--grey-700)] hover:file:bg-[var(--grey-200)]"
            />
            <p className="mt-2 text-xs text-[var(--grey-500)]">
              CSV format: email, name, department, role, location, tenure (email required, rest optional)
            </p>
          </div>
        ) : (
          <div>
            <textarea
              value={pasteContent}
              onChange={(e) => setPasteContent(e.target.value)}
              placeholder="email,name,department,role,location,tenure&#10;jane@example.com,Jane Doe,Engineering,Manager,Remote,3-5 years"
              rows={6}
              className="w-full rounded-lg border border-[var(--grey-100)] px-3 py-2 text-sm text-[var(--grey-900)] placeholder:text-[var(--grey-400)] focus:border-[var(--grey-500)] focus:outline-none resize-none"
            />
            <button
              type="button"
              onClick={handleParsePaste}
              disabled={!pasteContent.trim()}
              className="mt-2 rounded-lg border border-[var(--grey-100)] px-3 py-1.5 text-sm font-medium text-[var(--grey-700)] hover:bg-[var(--grey-50)] disabled:opacity-50"
            >
              Parse
            </button>
          </div>
        )}

        {/* Error summary */}
        {invalidRows.length > 0 && (
          <div className="rounded-lg bg-red-50 p-3">
            <p className="text-sm font-medium text-red-700">
              {invalidRows.length} invalid row{invalidRows.length !== 1 ? 's' : ''}
            </p>
            <ul className="mt-1 space-y-0.5 text-xs text-red-600">
              {invalidRows.slice(0, 5).map((r, i) => (
                <li key={i}>
                  {r.email || '(empty)'}: {r.error}
                </li>
              ))}
              {invalidRows.length > 5 && (
                <li>...and {invalidRows.length - 5} more</li>
              )}
            </ul>
          </div>
        )}

        {/* Preview table */}
        {parsedRows.length > 0 && (
          <div className="max-h-48 overflow-auto rounded-lg border border-[var(--grey-100)]">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-[var(--grey-50)]">
                <tr>
                  <th className="px-3 py-1.5 font-medium text-[var(--grey-600)]">Email</th>
                  <th className="px-3 py-1.5 font-medium text-[var(--grey-600)]">Name</th>
                  <th className="px-3 py-1.5 font-medium text-[var(--grey-600)]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--grey-100)]">
                {parsedRows.slice(0, 50).map((r, i) => (
                  <tr key={i} className={r.valid ? '' : 'bg-red-50/50'}>
                    <td className="px-3 py-1.5 text-[var(--grey-900)]">{r.email || '--'}</td>
                    <td className="px-3 py-1.5 text-[var(--grey-700)]">{r.name || '--'}</td>
                    <td className="px-3 py-1.5">
                      {r.valid ? (
                        <span className="text-green-700">Valid</span>
                      ) : (
                        <span className="text-red-600">{r.error}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-[var(--grey-100)] pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-[var(--grey-600)] hover:text-[var(--grey-900)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={validRows.length === 0 || isPending}
            className="rounded-lg bg-[var(--grey-900)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--grey-800)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending
              ? 'Importing...'
              : `Import ${validRows.length} recipient${validRows.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </dialog>
  );
}
