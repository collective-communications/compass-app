/**
 * Button to trigger score recalculation for a survey.
 * Calls the score-survey Edge Function and shows inline loading/error state.
 */

import { useState, type ReactElement } from 'react';
import { triggerScoreRecalculation } from '../services/deployment-service';

export interface RecalculateButtonProps {
  surveyId: string;
  /** Whether the survey has scores already calculated */
  scoresCalculated: boolean;
  /** Timestamp of last calculation */
  scoresCalculatedAt: string | null;
}

type RecalcState = 'idle' | 'loading' | 'success' | 'error';

export function RecalculateButton({
  surveyId,
  scoresCalculated,
  scoresCalculatedAt,
}: RecalculateButtonProps): ReactElement {
  const [state, setState] = useState<RecalcState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleRecalculate(): Promise<void> {
    setState('loading');
    setErrorMessage(null);

    try {
      await triggerScoreRecalculation(surveyId);
      setState('success');
      // Reset to idle after 3 seconds
      setTimeout(() => setState('idle'), 3000);
    } catch (err) {
      setState('error');
      setErrorMessage(err instanceof Error ? err.message : 'Recalculation failed');
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleRecalculate}
          disabled={state === 'loading'}
          className="rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)] px-4 py-2 text-sm font-medium text-[var(--grey-900)] hover:bg-[var(--grey-50)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {state === 'loading' ? 'Calculating...' : 'Recalculate Scores'}
        </button>

        {state === 'success' && (
          <span className="text-xs text-green-700">Scores updated</span>
        )}
      </div>

      {state === 'error' && errorMessage && (
        <p className="text-xs text-red-700">{errorMessage}</p>
      )}

      {scoresCalculated && scoresCalculatedAt && state === 'idle' && (
        <p className="text-xs text-[var(--text-secondary)]">
          Last calculated:{' '}
          {new Date(scoresCalculatedAt).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </p>
      )}
    </div>
  );
}
