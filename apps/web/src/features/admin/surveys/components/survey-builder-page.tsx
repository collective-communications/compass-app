/**
 * Admin survey builder page.
 * Two-column layout (desktop): dimension sidebar + question list.
 * Single-column (mobile): dimension pills + question list.
 * Supports editing questions via dialog with auto-save.
 * Surveys with responses are fully locked.
 */

import { useState, useMemo, useCallback, type ReactElement } from 'react';
import type { QuestionWithDimension } from '@compass/types';
import { useSurveyBuilder } from '../hooks/use-survey-builder';
import { DimensionNav } from './dimension-nav';
import { QuestionRow } from './question-row';
import { EditQuestionDialog } from './edit-question-dialog';
import { AutoSaveIndicator, type AutoSaveStatus } from './auto-save-indicator';

interface SurveyBuilderPageProps {
  surveyId: string;
  onBack: () => void;
}

export function SurveyBuilderPage({ surveyId, onBack }: SurveyBuilderPageProps): ReactElement {
  const { data, isLoading, error } = useSurveyBuilder({ surveyId });
  const [activeDimensionId, setActiveDimensionId] = useState<string | null>(null);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>('idle');

  const filteredQuestions = useMemo((): QuestionWithDimension[] => {
    if (!data?.questions) return [];
    if (activeDimensionId === null) return data.questions;
    return data.questions.filter((q) => q.dimension.dimensionId === activeDimensionId);
  }, [data?.questions, activeDimensionId]);

  const questionCounts = useMemo((): Record<string, number> => {
    if (!data?.questions) return {};
    const counts: Record<string, number> = {};
    for (const q of data.questions) {
      const dimId = q.dimension.dimensionId;
      counts[dimId] = (counts[dimId] ?? 0) + 1;
    }
    return counts;
  }, [data?.questions]);

  const editingQuestion = useMemo((): QuestionWithDimension | null => {
    if (!editingQuestionId || !data?.questions) return null;
    return data.questions.find((q) => q.id === editingQuestionId) ?? null;
  }, [editingQuestionId, data?.questions]);

  const handleCloseDialog = useCallback((): void => {
    setEditingQuestionId(null);
  }, []);

  if (isLoading) {
    return (
      <div className="py-12 text-center text-sm text-[var(--grey-500)]">
        Loading survey builder...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
          Failed to load survey. Please try again.
        </div>
      </div>
    );
  }

  const { survey, dimensions, hasResponses } = data;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <button
          type="button"
          onClick={onBack}
          className="mb-2 text-sm text-[var(--grey-600)] transition-colors hover:text-[var(--grey-900)]"
        >
          &larr; Back to Surveys
        </button>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[var(--grey-900)]">{survey.title}</h1>
          <AutoSaveIndicator status={autoSaveStatus} />
        </div>
      </div>

      {/* Locked banner */}
      {hasResponses && (
        <div
          className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
          role="status"
        >
          This survey has responses and cannot be edited. Changes to questions could invalidate existing data.
        </div>
      )}

      {/* Dimension nav (mobile pills) */}
      <div className="mb-4 md:hidden">
        <DimensionNav
          dimensions={dimensions}
          activeDimensionId={activeDimensionId}
          onSelect={setActiveDimensionId}
          questionCounts={questionCounts}
        />
      </div>

      {/* Two-column layout */}
      <div className="flex gap-6">
        {/* Dimension sidebar (desktop) */}
        <div className="hidden md:block">
          <DimensionNav
            dimensions={dimensions}
            activeDimensionId={activeDimensionId}
            onSelect={setActiveDimensionId}
            questionCounts={questionCounts}
          />
        </div>

        {/* Question list */}
        <div className="min-w-0 flex-1">
          {filteredQuestions.length === 0 ? (
            <div className="py-12 text-center text-sm text-[var(--grey-500)]">
              No questions in this dimension.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredQuestions.map((question) => (
                <QuestionRow
                  key={question.id}
                  question={question}
                  isLocked={hasResponses}
                  onEdit={setEditingQuestionId}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit dialog */}
      {editingQuestion && (
        <EditQuestionDialog
          question={editingQuestion}
          surveyId={surveyId}
          isOpen={editingQuestionId !== null}
          onClose={handleCloseDialog}
          onAutoSaveStatusChange={setAutoSaveStatus}
        />
      )}
    </div>
  );
}
