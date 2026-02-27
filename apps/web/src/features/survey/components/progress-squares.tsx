/**
 * Progress squares indicator for the survey question flow.
 * Grid of small squares showing answered/unanswered/current state.
 * CSS hover magnification on hovered square and its neighbors (dock-style).
 * Clickable to jump to any question.
 */
import { useCallback } from 'react';

interface ProgressSquaresProps {
  /** Total number of questions */
  total: number;
  /** Index of the current question (0-based) */
  currentIndex: number;
  /** Set of answered question indices (0-based) */
  answeredIndices: Set<number>;
  /** Callback when a square is clicked to jump to that question */
  onJump: (index: number) => void;
}

/**
 * Dock-style magnification: hovered square scales up,
 * immediate neighbors scale slightly, creating a "fisheye" effect.
 * Uses CSS group-hover with sibling selectors via a custom approach.
 */
export function ProgressSquares({
  total,
  currentIndex,
  answeredIndices,
  onJump,
}: ProgressSquaresProps): React.ReactNode {
  const handleClick = useCallback(
    (index: number) => {
      onJump(index);
    },
    [onJump],
  );

  return (
    <div
      className="flex flex-wrap items-center justify-center gap-[2px]"
      role="group"
      aria-label="Survey progress"
    >
      {Array.from({ length: total }, (_, i) => {
        const isAnswered = answeredIndices.has(i);
        const isCurrent = i === currentIndex;

        return (
          <button
            key={i}
            type="button"
            aria-label={`Question ${i + 1} of ${total}, ${isCurrent ? 'current' : isAnswered ? 'answered' : 'unanswered'}`}
            onClick={() => handleClick(i)}
            className={`h-3 w-3 rounded-[2px] transition-all duration-150
              hover:scale-150
              [&:hover+button]:scale-125
              ${
                isCurrent
                  ? 'bg-[#0A3B4F] ring-2 ring-[#0A3B4F]/30'
                  : isAnswered
                    ? 'bg-[#0A3B4F]'
                    : 'bg-[var(--grey-100)]'
              }
              cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#0A3B4F]`}
          />
        );
      })}
    </div>
  );
}
