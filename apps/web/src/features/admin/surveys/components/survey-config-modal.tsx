/**
 * Survey configuration modal using native <dialog>.
 * Allows editing title, description, dates, and anonymity threshold.
 * Provides "Save as Draft" and "Deploy Now" actions.
 */

import { useRef, useEffect, useState, type ReactElement, type FormEvent } from 'react';
import type { Survey, SurveySettings } from '@compass/types';
import { DEFAULT_SURVEY_ENGINE_CONFIG } from '@compass/types';
import { ReminderConfig } from './reminder-config';

export interface SurveyConfigModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Close the modal */
  onClose: () => void;
  /** Current survey data to populate the form */
  survey: Survey;
  /** Whether the survey has at least one question (required for deployment) */
  hasQuestions: boolean;
  /** Save as draft callback */
  onSave: (config: SurveyConfigFormData) => void;
  /** Deploy now callback */
  onDeploy: (config: SurveyConfigFormData) => void;
  /** Whether a mutation is in progress */
  isPending: boolean;
}

export interface SurveyConfigFormData {
  title: string;
  description: string | null;
  opensAt: string;
  closesAt: string;
  settings: Partial<SurveySettings>;
  reminderSchedule: number[];
}

function toDateInputValue(isoString: string | null): string {
  if (!isoString) return '';
  return isoString.slice(0, 10);
}

export function SurveyConfigModal({
  open,
  onClose,
  survey,
  hasQuestions,
  onSave,
  onDeploy,
  isPending,
}: SurveyConfigModalProps): ReactElement {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [title, setTitle] = useState(survey.title);
  const [description, setDescription] = useState(survey.description ?? '');
  const [opensAt, setOpensAt] = useState(toDateInputValue(survey.opensAt));
  const [closesAt, setClosesAt] = useState(toDateInputValue(survey.closesAt));
  const [anonymityThreshold, setAnonymityThreshold] = useState(
    survey.settings?.allowAnonymous
      ? DEFAULT_SURVEY_ENGINE_CONFIG.anonymityThreshold
      : DEFAULT_SURVEY_ENGINE_CONFIG.anonymityThreshold,
  );
  const [reminderSchedule, setReminderSchedule] = useState<number[]>([]);

  // Validation
  const dateError =
    opensAt && closesAt && new Date(opensAt) >= new Date(closesAt)
      ? 'Open date must be before close date'
      : null;
  const titleError = title.trim().length === 0 ? 'Title is required' : null;
  const isValid = !dateError && !titleError && opensAt && closesAt;
  const canDeploy = isValid && hasQuestions;

  // Sync dialog open/close with prop
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Reset form when survey changes
  useEffect(() => {
    setTitle(survey.title);
    setDescription(survey.description ?? '');
    setOpensAt(toDateInputValue(survey.opensAt));
    setClosesAt(toDateInputValue(survey.closesAt));
  }, [survey]);

  function getFormData(): SurveyConfigFormData {
    return {
      title: title.trim(),
      description: description.trim() || null,
      opensAt: new Date(opensAt).toISOString(),
      closesAt: new Date(closesAt).toISOString(),
      settings: {
        allowAnonymous: true,
        requireMetadata: true,
        showProgressBar: true,
        welcomeMessage: null,
        completionMessage: null,
      },
      reminderSchedule,
    };
  }

  function handleSave(e: FormEvent): void {
    e.preventDefault();
    if (!isValid) return;
    onSave(getFormData());
  }

  function handleDeploy(): void {
    if (!canDeploy) return;
    onDeploy(getFormData());
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="w-full max-w-lg rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)] p-0 shadow-lg backdrop:bg-black/40"
    >
      <form onSubmit={handleSave} className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--grey-900)]">Survey Configuration</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-[var(--text-secondary)] hover:text-[var(--grey-700)]"
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

        {/* Title */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="config-title" className="text-sm font-medium text-[var(--grey-700)]">
            Title
          </label>
          <input
            id="config-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-lg border border-[var(--grey-100)] px-3 py-2 text-sm text-[var(--grey-900)] outline-none focus:border-[var(--grey-500)]"
            required
          />
          {titleError && (
            <p className="text-xs text-red-700">{titleError}</p>
          )}
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="config-description" className="text-sm font-medium text-[var(--grey-700)]">
            Description
          </label>
          <textarea
            id="config-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="rounded-lg border border-[var(--grey-100)] px-3 py-2 text-sm text-[var(--grey-900)] outline-none focus:border-[var(--grey-500)] resize-none"
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="config-opens" className="text-sm font-medium text-[var(--grey-700)]">
              Opens
            </label>
            <input
              id="config-opens"
              type="date"
              value={opensAt}
              onChange={(e) => setOpensAt(e.target.value)}
              className="rounded-lg border border-[var(--grey-100)] px-3 py-2 text-sm text-[var(--grey-900)] outline-none focus:border-[var(--grey-500)]"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="config-closes" className="text-sm font-medium text-[var(--grey-700)]">
              Closes
            </label>
            <input
              id="config-closes"
              type="date"
              value={closesAt}
              onChange={(e) => setClosesAt(e.target.value)}
              className="rounded-lg border border-[var(--grey-100)] px-3 py-2 text-sm text-[var(--grey-900)] outline-none focus:border-[var(--grey-500)]"
              required
            />
          </div>
        </div>
        {dateError && (
          <p className="text-xs text-red-700">{dateError}</p>
        )}

        {/* Anonymity Threshold */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="config-threshold" className="text-sm font-medium text-[var(--grey-700)]">
            Anonymity Threshold
          </label>
          <p className="text-xs text-[var(--text-secondary)]">
            Minimum responses before segment data is visible
          </p>
          <input
            id="config-threshold"
            type="number"
            min={1}
            max={50}
            value={anonymityThreshold}
            onChange={(e) => setAnonymityThreshold(Number(e.target.value))}
            className="w-24 rounded-lg border border-[var(--grey-100)] px-3 py-2 text-sm text-[var(--grey-900)] outline-none focus:border-[var(--grey-500)]"
          />
        </div>

        {/* Reminder Schedule */}
        <ReminderConfig value={reminderSchedule} onChange={setReminderSchedule} />

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-[var(--grey-100)] pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isValid || isPending}
            className="rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)] px-4 py-2 text-sm font-medium text-[var(--grey-900)] hover:bg-[var(--grey-50)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save as Draft
          </button>
          <button
            type="button"
            onClick={handleDeploy}
            disabled={!canDeploy || isPending}
            title={!hasQuestions ? 'Add at least one question before deploying' : undefined}
            className="rounded-lg bg-[var(--grey-900)] px-4 py-2 text-sm font-medium text-[var(--grey-50)] hover:bg-[var(--grey-800)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? 'Deploying...' : 'Deploy Now'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
