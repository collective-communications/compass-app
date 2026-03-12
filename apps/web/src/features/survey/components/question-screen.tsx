/**
 * Main question screen — orchestrates the question-by-question survey flow.
 * Shows one question at a time with Likert scale, progress squares,
 * navigation buttons, keyboard shortcuts, and answer autosave.
 *
 * Question text only — dimension labels are intentionally hidden
 * to prevent bias in responses.
 */
import { useState, useCallback, useMemo } from 'react';
import { QuestionType, type LikertValue, type QuestionWithDimension } from '@compass/types';
import { useSurveyContext } from '../context/survey-context';
import { useQuestions } from '../hooks/use-questions';
import { useAnswerAutosave } from '../hooks/use-answer-autosave';
import { useSurveyKeyboard } from '../hooks/use-survey-keyboard';
import { useAnswerStore } from '../stores/answer-store';
import { LikertScale } from './likert-scale';
import { ProgressSquares } from './progress-squares';
import { QuestionNavButtons } from './question-nav-buttons';

interface QuestionScreenProps {
  /** Callback when all Likert questions are complete (transition to open-ended) */
  onComplete: () => void;
}

/** Question-by-question survey flow with autosave and keyboard shortcuts. */
export function QuestionScreen({ onComplete }: QuestionScreenProps): React.ReactNode {
  const { survey, sessionToken } = useSurveyContext();
  const { data: allQuestions, isLoading, error } = useQuestions(survey.id);
  const [currentIndex, setCurrentIndex] = useState(0);

  const answers = useAnswerStore((s) => s.answers);
  const setAnswer = useAnswerStore((s) => s.setAnswer);
  const lastError = useAnswerStore((s) => s.lastError);

  // Filter to Likert questions only (open-text handled on a separate screen)
  const likertQuestions = useMemo(
    () => (allQuestions ?? []).filter((q) => q.type === QuestionType.LIKERT_4),
    [allQuestions],
  );

  const currentQuestion: QuestionWithDimension | undefined = likertQuestions[currentIndex];
  const currentAnswer = currentQuestion ? (answers[currentQuestion.id] as LikertValue | undefined) : undefined;
  const isAnswered = currentAnswer !== undefined;
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === likertQuestions.length - 1;

  // Answered indices for progress squares
  const answeredIndices = useMemo(() => {
    const indices = new Set<number>();
    likertQuestions.forEach((q, i) => {
      if (answers[q.id] !== undefined) {
        indices.add(i);
      }
    });
    return indices;
  }, [likertQuestions, answers]);

  // Question texts for progress square tooltips (answered squares only)
  const questionTexts = useMemo(
    () => likertQuestions.map((q) => q.text),
    [likertQuestions],
  );

  // Autosave
  useAnswerAutosave(sessionToken);

  // Navigation callbacks
  const goNext = useCallback(() => {
    if (!isAnswered) return;
    if (isLast) {
      onComplete();
      return;
    }
    setCurrentIndex((prev) => Math.min(prev + 1, likertQuestions.length - 1));
  }, [isAnswered, isLast, onComplete, likertQuestions.length]);

  const goPrevious = useCallback(() => {
    if (isFirst) return;
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  }, [isFirst]);

  const handleSelectOption = useCallback(
    (value: LikertValue) => {
      if (!currentQuestion) return;
      setAnswer(currentQuestion.id, value);
    },
    [currentQuestion, setAnswer],
  );

  const handleJump = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  // Keyboard shortcuts
  useSurveyKeyboard({
    isActive: !!currentQuestion,
    onSelectOption: handleSelectOption,
    onNext: goNext,
    onPrevious: goPrevious,
    isAnswered,
    isFirst,
  });

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-[600px] items-center justify-center py-24">
        <div className="text-sm text-[var(--grey-500)]">Loading questions...</div>
      </div>
    );
  }

  if (error || !allQuestions) {
    return (
      <div className="mx-auto flex max-w-[600px] items-center justify-center py-24">
        <div className="text-sm text-[var(--severity-critical-text)]">
          Failed to load survey questions. Please refresh and try again.
        </div>
      </div>
    );
  }

  if (likertQuestions.length === 0) {
    return (
      <div className="mx-auto flex max-w-[600px] items-center justify-center py-24">
        <div className="text-sm text-[var(--grey-500)]">No questions found for this survey.</div>
      </div>
    );
  }

  if (!currentQuestion) {
    return null;
  }

  return (
    <div className="mx-auto flex max-w-[600px] flex-col gap-8 px-4 py-8">
      {/* Progress squares — above question for orientation */}
      <ProgressSquares
        total={likertQuestions.length}
        currentIndex={currentIndex}
        answeredIndices={answeredIndices}
        onJump={handleJump}
        questionTexts={questionTexts}
      />

      {/* Question counter */}
      <div className="text-sm font-medium text-[var(--grey-500)]">
        Question {currentIndex + 1} of {likertQuestions.length}
      </div>

      {/* Question text — no dimension label shown */}
      <h2 className="text-lg font-semibold leading-snug text-[var(--grey-900)]">
        {currentQuestion.text}
      </h2>

      {/* Likert scale */}
      <LikertScale
        value={currentAnswer}
        onChange={handleSelectOption}
        name={currentQuestion.id}
      />

      {/* Autosave error indicator */}
      {lastError && (
        <div className="rounded-md border border-[var(--severity-critical-border)]/20 bg-[var(--severity-critical-border)]/5 px-3 py-2 text-xs text-[var(--severity-critical-text)]">
          {lastError}
        </div>
      )}

      {/* Navigation */}
      <QuestionNavButtons
        showPrevious={!isFirst}
        nextEnabled={isAnswered}
        isLastQuestion={isLast}
        onPrevious={goPrevious}
        onNext={goNext}
      />
    </div>
  );
}
