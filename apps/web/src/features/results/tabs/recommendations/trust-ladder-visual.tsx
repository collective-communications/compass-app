/**
 * TrustLadderVisual — interactive vertical ladder visualization.
 * Bottom = rung 1 (foundation), top = rung 9.
 * Each rung is colored by status and expandable to show detail.
 */

import { useState, type ReactElement } from 'react';
import type { TrustLadderResult, TrustRungScore, TrustRungStatus } from '@compass/types';

export interface TrustLadderVisualProps {
  result: TrustLadderResult;
}

const STATUS_STYLES: Record<TrustRungStatus, string> = {
  achieved: 'bg-green-100 text-green-800 border-green-300',
  in_progress: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  not_started: 'bg-[var(--grey-50)] text-[var(--grey-500)] border-[var(--grey-100)]',
};

const STATUS_LABELS: Record<TrustRungStatus, string> = {
  achieved: 'Achieved',
  in_progress: 'In Progress',
  not_started: 'Not Started',
};

/** Capitalize first letter of a dimension code. */
function dimensionLabel(code: string): string {
  return code.charAt(0).toUpperCase() + code.slice(1);
}

function RungRow({ rung, isCurrentLevel }: { rung: TrustRungScore; isCurrentLevel: boolean }): ReactElement {
  const [expanded, setExpanded] = useState(false);

  return (
    <li>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={`flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors ${STATUS_STYLES[rung.status]}`}
        aria-expanded={expanded}
        aria-label={`Rung ${rung.rung}: ${rung.name} — ${STATUS_LABELS[rung.status]}`}
      >
        <span className="shrink-0 text-xs font-bold opacity-60">{rung.rung}</span>
        <span className="flex-1 font-medium">{rung.name}</span>
        {isCurrentLevel && (
          <span className="shrink-0 rounded-full bg-green-700 px-2 py-0.5 text-[10px] font-semibold text-white">
            Current
          </span>
        )}
        <span className="shrink-0 text-xs font-semibold tabular-nums">
          {rung.score.toFixed(1)} / {rung.maxScore}
        </span>
      </button>

      {expanded && (
        <div className="mt-1 ml-6 rounded-md border border-[var(--grey-100)] bg-white px-3 py-2 text-xs text-[var(--grey-600)]">
          <div className="flex items-center justify-between">
            <span>Dimension: <strong>{dimensionLabel(rung.dimensionCode)}</strong></span>
            <span className="font-medium">{STATUS_LABELS[rung.status]}</span>
          </div>
          <div className="mt-1">
            Score: {rung.score.toFixed(2)} out of {rung.maxScore}
          </div>
        </div>
      )}
    </li>
  );
}

/** Interactive Trust Ladder visualization. */
export function TrustLadderVisual({ result }: TrustLadderVisualProps): ReactElement {
  // Display rungs from top (9) to bottom (1) visually
  const reversedRungs = [...result.rungs].reverse();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <h4 className="text-xs font-semibold text-[var(--grey-500)] uppercase tracking-wide">
          Trust Ladder
        </h4>
        {result.currentLevel > 0 && (
          <span className="text-xs text-[var(--grey-500)]">
            Level {result.currentLevel} of 9
          </span>
        )}
      </div>

      <ol className="flex flex-col gap-1" aria-label="Trust Ladder rungs">
        {reversedRungs.map((rung) => (
          <RungRow
            key={rung.rung}
            rung={rung}
            isCurrentLevel={rung.rung === result.currentLevel}
          />
        ))}
      </ol>

      {result.nextActions.length > 0 && (
        <div className="mt-1 rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
          <span className="font-semibold">Next focus: </span>
          {result.nextActions.join(', ')}
        </div>
      )}
    </div>
  );
}
