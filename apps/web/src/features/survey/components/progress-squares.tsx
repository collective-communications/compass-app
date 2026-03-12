/**
 * Progress squares indicator for the survey question flow.
 * Grid of small squares showing answered/unanswered/current state.
 * Dock-style fisheye magnification on hover (cosine curve, reach=3, maxScale=2.4).
 * Clickable to jump to any question.
 */
import { useCallback, useRef, useState } from 'react';

/** Dock-style scale: cosine falloff from pointer position. */
function dockScale(index: number, pointerIndex: number, maxScale: number, reach: number): number {
  const dist = Math.abs(index - pointerIndex);
  if (dist > reach) return 1;
  const t = 1 - dist / reach;
  return 1 + ((maxScale - 1) * (Math.cos(Math.PI * (1 - t)) + 1)) / 2;
}

const DOCK_MAX = 2.4;
const DOCK_REACH = 3;

interface ProgressSquaresProps {
  /** Total number of questions */
  total: number;
  /** Index of the current question (0-based) */
  currentIndex: number;
  /** Set of answered question indices (0-based) */
  answeredIndices: Set<number>;
  /** Callback when a square is clicked to jump to that question */
  onJump: (index: number) => void;
  /** Optional question texts for tooltip on answered squares */
  questionTexts?: string[];
}

/**
 * Dock-style magnification: hovered square scales up with cosine falloff
 * across neighboring squares, matching the macOS dock fisheye effect.
 */
export function ProgressSquares({
  total,
  currentIndex,
  answeredIndices,
  onJump,
  questionTexts,
}: ProgressSquaresProps): React.ReactNode {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClick = useCallback(
    (index: number) => {
      onJump(index);
    },
    [onJump],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const container = containerRef.current;
      if (!container) return;
      const buttons = container.querySelectorAll('button');
      let closest = -1;
      let closestDist = Infinity;
      for (let i = 0; i < buttons.length; i++) {
        const rect = buttons[i]!.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
        if (dist < closestDist) {
          closestDist = dist;
          closest = i;
        }
      }
      setHoverIndex(closest);
    },
    [],
  );

  const handleMouseLeave = useCallback(() => {
    setHoverIndex(null);
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex flex-wrap items-center justify-center gap-[2px]"
      role="group"
      aria-label="Survey progress"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {Array.from({ length: total }, (_, i) => {
        const isAnswered = answeredIndices.has(i);
        const isCurrent = i === currentIndex;
        const scale =
          hoverIndex !== null ? dockScale(i, hoverIndex, DOCK_MAX, DOCK_REACH) : 1;

        const tooltipText =
          questionTexts && isAnswered && hoverIndex === i
            ? questionTexts[i]
            : undefined;

        return (
          <button
            key={i}
            type="button"
            title={tooltipText}
            aria-label={`Question ${i + 1} of ${total}, ${isCurrent ? 'current' : isAnswered ? 'answered' : 'unanswered'}`}
            onClick={() => handleClick(i)}
            style={{
              transform: `scale(${scale})`,
              transition: 'transform 150ms ease-out',
            }}
            className={`h-3 w-3 rounded-[2px]
              ${
                isCurrent
                  ? 'bg-[var(--color-core)] ring-2 ring-[var(--color-core-text)]/30'
                  : isAnswered
                    ? 'bg-[var(--color-core)]'
                    : 'bg-[var(--grey-100)]'
              }
              cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-core-text)]`}
          />
        );
      })}
    </div>
  );
}
