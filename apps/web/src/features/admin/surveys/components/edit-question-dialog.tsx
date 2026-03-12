/**
 * Dialog for editing a survey question's text, help text,
 * reverse-scored flag, and diagnostic focus.
 * Auto-saves changes after 500ms debounce.
 */

import { useState, useEffect, useRef, useId, useCallback, type ReactElement } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Question } from '@compass/types';
import { updateQuestion, type UpdateQuestionParams } from '../services/admin-survey-service';
import { surveyBuilderKeys } from '../hooks/use-survey-builder';
import type { AutoSaveStatus } from './auto-save-indicator';

interface EditQuestionDialogProps {
  question: Question;
  surveyId: string;
  isOpen: boolean;
  onClose: () => void;
  onAutoSaveStatusChange: (status: AutoSaveStatus) => void;
}

const DEBOUNCE_MS = 500;

export function EditQuestionDialog({
  question,
  surveyId,
  isOpen,
  onClose,
  onAutoSaveStatusChange,
}: EditQuestionDialogProps): ReactElement | null {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const queryClient = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [text, setText] = useState(question.text);
  const [description, setDescription] = useState(question.description ?? '');
  const [reverseScored, setReverseScored] = useState(question.reverseScored);
  const [diagnosticFocus, setDiagnosticFocus] = useState(question.diagnosticFocus ?? '');

  // Sync state when question prop changes
  useEffect(() => {
    setText(question.text);
    setDescription(question.description ?? '');
    setReverseScored(question.reverseScored);
    setDiagnosticFocus(question.diagnosticFocus ?? '');
  }, [question]);

  // Open/close the dialog element
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  const saveMutation = useMutation({
    mutationFn: (params: UpdateQuestionParams) => updateQuestion(params),
    onMutate: () => {
      onAutoSaveStatusChange('saving');
    },
    onSuccess: () => {
      onAutoSaveStatusChange('saved');
      void queryClient.invalidateQueries({ queryKey: surveyBuilderKeys.detail(surveyId) });
    },
    onError: () => {
      onAutoSaveStatusChange('error');
    },
  });

  const scheduleAutoSave = useCallback(
    (updates: Partial<Omit<UpdateQuestionParams, 'id'>>) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        saveMutation.mutate({ id: question.id, ...updates });
      }, DEBOUNCE_MS);
    },
    [question.id, saveMutation],
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  function handleTextChange(value: string): void {
    setText(value);
    scheduleAutoSave({ text: value });
  }

  function handleDescriptionChange(value: string): void {
    setDescription(value);
    scheduleAutoSave({ description: value || null });
  }

  function handleReverseScoredChange(value: boolean): void {
    setReverseScored(value);
    // Toggle saves immediately, no debounce needed
    saveMutation.mutate({ id: question.id, reverseScored: value });
  }

  function handleDiagnosticFocusChange(value: string): void {
    setDiagnosticFocus(value);
    scheduleAutoSave({ diagnosticFocus: value || null });
  }

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      className="w-full max-w-lg rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)] p-0 shadow-lg backdrop:bg-black/40"
    >
      <div className="p-6">
        <h2 id={titleId} className="text-lg font-semibold text-[var(--grey-900)]">
          Edit Question
        </h2>

        <div className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="q-text" className="text-sm font-medium text-[var(--grey-700)]">
              Question Text
            </label>
            <textarea
              id="q-text"
              value={text}
              onChange={(e) => handleTextChange(e.target.value)}
              rows={3}
              className="rounded-lg border border-[var(--grey-300)] bg-[var(--grey-50)] px-3 py-2.5 text-sm text-[var(--grey-900)] placeholder:text-[var(--grey-400)] focus:border-[var(--color-core-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-core-text)]/20"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="q-desc" className="text-sm font-medium text-[var(--grey-700)]">
              Help Text
            </label>
            <textarea
              id="q-desc"
              value={description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              rows={2}
              placeholder="Optional context shown to respondents"
              className="rounded-lg border border-[var(--grey-300)] bg-[var(--grey-50)] px-3 py-2.5 text-sm text-[var(--grey-900)] placeholder:text-[var(--grey-400)] focus:border-[var(--color-core-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-core-text)]/20"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="q-focus" className="text-sm font-medium text-[var(--grey-700)]">
              Diagnostic Focus
            </label>
            <input
              id="q-focus"
              type="text"
              value={diagnosticFocus}
              onChange={(e) => handleDiagnosticFocusChange(e.target.value)}
              placeholder="e.g., Leadership alignment"
              className="rounded-lg border border-[var(--grey-300)] bg-[var(--grey-50)] px-3 py-2.5 text-sm text-[var(--grey-900)] placeholder:text-[var(--grey-400)] focus:border-[var(--color-core-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-core-text)]/20"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              id="q-reverse"
              type="checkbox"
              checked={reverseScored}
              onChange={(e) => handleReverseScoredChange(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--grey-300)] text-[var(--color-core-text)] focus:ring-[var(--color-core-text)]/20"
            />
            <label htmlFor="q-reverse" className="text-sm text-[var(--grey-700)]">
              Reverse scored
            </label>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--grey-300)] px-4 py-2 text-sm font-medium text-[var(--grey-700)] transition-colors hover:bg-[var(--grey-100)]"
          >
            Done
          </button>
        </div>
      </div>
    </dialog>
  );
}
