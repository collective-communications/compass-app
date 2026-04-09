/**
 * Dialog for editing a survey question's text, help text,
 * reverse-scored flag, and diagnostic focus.
 * Auto-saves changes after 500ms debounce.
 */

import { useState, useEffect, useRef, useId, useMemo, useCallback, type ReactElement } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Question, SubDimension, Dimension, QuestionType } from '@compass/types';
import { QuestionType as QT } from '@compass/types';
import { updateQuestion, type UpdateQuestionParams } from '../services/admin-survey-service';
import { surveyBuilderKeys } from '../hooks/use-survey-builder';
import type { AutoSaveStatus } from './auto-save-indicator';

interface EditQuestionDialogProps {
  question: Question;
  surveyId: string;
  isOpen: boolean;
  onClose: () => void;
  onAutoSaveStatusChange: (status: AutoSaveStatus) => void;
  /** All available sub-dimensions for the selector */
  subDimensions?: SubDimension[];
  /** All dimensions for grouping sub-dimensions */
  dimensions?: Dimension[];
  /** The question's assigned dimension ID (from question_dimensions mapping) */
  questionDimensionId?: string | null;
}

const DEBOUNCE_MS = 500;

/** Whether a question type is Likert (new or legacy) */
function isLikertType(type: QuestionType): boolean {
  return type === QT.LIKERT || type === QT.LIKERT_4;
}

export function EditQuestionDialog({
  question,
  surveyId,
  isOpen,
  onClose,
  onAutoSaveStatusChange,
  subDimensions = [],
  dimensions = [],
  questionDimensionId = null,
}: EditQuestionDialogProps): ReactElement | null {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const queryClient = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [text, setText] = useState(question.text);
  const [description, setDescription] = useState(question.description ?? '');
  const [reverseScored, setReverseScored] = useState(question.reverseScored);
  const [diagnosticFocus, setDiagnosticFocus] = useState(question.diagnosticFocus ?? '');
  const [subDimensionId, setSubDimensionId] = useState(question.subDimensionId ?? '');

  // Sync state when question prop changes
  useEffect(() => {
    setText(question.text);
    setDescription(question.description ?? '');
    setReverseScored(question.reverseScored);
    setDiagnosticFocus(question.diagnosticFocus ?? '');
    setSubDimensionId(question.subDimensionId ?? '');
  }, [question]);

  /** Sub-dimensions filtered by the question's parent dimension, grouped by dimension for display */
  const subDimensionOptions = useMemo(() => {
    if (!isLikertType(question.type) || subDimensions.length === 0) return [];

    // If the question has an assigned dimension, filter to that dimension's sub-dimensions
    if (questionDimensionId) {
      return subDimensions.filter((sd) => sd.dimensionId === questionDimensionId);
    }

    // No dimension assigned yet — return all sub-dimensions grouped by dimension
    return subDimensions;
  }, [question.type, subDimensions, questionDimensionId]);

  /** Group sub-dimensions by dimension for the <optgroup> display */
  const subDimensionGroups = useMemo(() => {
    if (subDimensionOptions.length === 0) return [];

    const dimMap = new Map(dimensions.map((d) => [d.id, d]));
    const groups = new Map<string, { dimension: Dimension; items: SubDimension[] }>();

    for (const sd of subDimensionOptions) {
      const dim = dimMap.get(sd.dimensionId);
      if (!dim) continue;
      const existing = groups.get(sd.dimensionId);
      if (existing) {
        existing.items.push(sd);
      } else {
        groups.set(sd.dimensionId, { dimension: dim, items: [sd] });
      }
    }

    return Array.from(groups.values()).sort(
      (a, b) => a.dimension.displayOrder - b.dimension.displayOrder,
    );
  }, [subDimensionOptions, dimensions]);

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

  function handleSubDimensionChange(value: string): void {
    setSubDimensionId(value);
    // Select saves immediately like reverse-scored toggle
    saveMutation.mutate({ id: question.id, subDimensionId: value || null });
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
              className="rounded-lg border border-[var(--grey-300)] bg-[var(--grey-50)] px-3 py-2.5 text-sm text-[var(--grey-900)] placeholder:text-[var(--text-placeholder)] focus:border-[var(--color-interactive)] focus:outline-none focus:ring-2 focus:ring-[var(--color-interactive)]/20"
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
              className="rounded-lg border border-[var(--grey-300)] bg-[var(--grey-50)] px-3 py-2.5 text-sm text-[var(--grey-900)] placeholder:text-[var(--text-placeholder)] focus:border-[var(--color-interactive)] focus:outline-none focus:ring-2 focus:ring-[var(--color-interactive)]/20"
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
              className="rounded-lg border border-[var(--grey-300)] bg-[var(--grey-50)] px-3 py-2.5 text-sm text-[var(--grey-900)] placeholder:text-[var(--text-placeholder)] focus:border-[var(--color-interactive)] focus:outline-none focus:ring-2 focus:ring-[var(--color-interactive)]/20"
            />
          </div>

          {/* Sub-dimension selector — only shown for Likert question types */}
          {isLikertType(question.type) && subDimensionGroups.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="q-subdim" className="text-sm font-medium text-[var(--grey-700)]">
                Sub-dimension
              </label>
              <select
                id="q-subdim"
                value={subDimensionId}
                onChange={(e) => handleSubDimensionChange(e.target.value)}
                className="rounded-lg border border-[var(--grey-300)] bg-[var(--grey-50)] px-3 py-2.5 text-sm text-[var(--grey-900)] focus:border-[var(--color-interactive)] focus:outline-none focus:ring-2 focus:ring-[var(--color-interactive)]/20"
              >
                <option value="">None</option>
                {questionDimensionId
                  ? /* Single dimension — flat list */
                    subDimensionOptions.map((sd) => (
                      <option key={sd.id} value={sd.id}>
                        {sd.name}
                      </option>
                    ))
                  : /* No dimension — group by dimension */
                    subDimensionGroups.map((group) => (
                      <optgroup key={group.dimension.id} label={group.dimension.name}>
                        {group.items.map((sd) => (
                          <option key={sd.id} value={sd.id}>
                            {sd.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-3">
            <input
              id="q-reverse"
              type="checkbox"
              checked={reverseScored}
              onChange={(e) => handleReverseScoredChange(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--grey-300)] text-[var(--color-core-text)] focus:ring-[var(--color-interactive)]/20"
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
