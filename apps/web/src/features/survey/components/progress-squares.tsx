/**
 * Progress squares indicator for the survey question flow.
 * Grid of small squares showing answered/unanswered/current state.
 * Dock-style fisheye magnification on hover (cosine curve, reach=3, maxScale=2.4).
 * Clickable to jump to answered questions only.
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

/** Compute square size class and gap based on total question count. */
function squareLayout(total: number): { sizeClass: string; gap: string } {
  if (total > 60) return { sizeClass: 'h-2 w-2 rounded-[1px]', gap: 'gap-[1px]' };
  if (total > 40) return { sizeClass: 'h-2.5 w-2.5 rounded-[2px]', gap: 'gap-[2px]' };
  return { sizeClass: 'h-3 w-3 rounded-[2px]', gap: 'gap-[2px]' };
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
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const { sizeClass, gap } = squareLayout(total);

  const handleClick = useCallback(
    (index: number) => {
      if (answeredIndices.has(index) || index === currentIndex) {
        onJump(index);
      }
    },
    [onJump, answeredIndices, currentIndex],
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

  // Tooltip: show for answered squares when hovered
  const showTooltip =
    hoverIndex !== null &&
    answeredIndices.has(hoverIndex) &&
    hoverIndex !== currentIndex &&
    questionTexts?.[hoverIndex];

  // Calculate tooltip position relative to the hovered button
  const tooltipStyle = (() => {
    if (!showTooltip || hoverIndex === null) return undefined;
    const btn = buttonRefs.current[hoverIndex];
    const container = containerRef.current;
    if (!btn || !container) return undefined;
    const btnRect = btn.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const left = btnRect.left - containerRect.left + btnRect.width / 2;
    return { left };
  })();

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-wrap items-center justify-center ${gap}`}
      role="group"
      aria-label="Survey progress"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Custom tooltip */}
      {showTooltip && tooltipStyle && hoverIndex !== null && (
        <div
          className="pointer-events-none absolute bottom-full z-10 mb-2 max-w-[280px] rounded-lg bg-[var(--grey-900)] px-3 py-2 text-xs text-white shadow-lg"
          style={{ left: tooltipStyle.left, transform: 'translateX(-50%)' }}
        >
          <span className="mr-1.5 text-[10px] font-bold opacity-50">{hoverIndex + 1}</span>
          <span className="line-clamp-2">{questionTexts![hoverIndex]}</span>
          <div
            className="absolute left-1/2 top-full -translate-x-1/2 border-x-[5px] border-t-[5px] border-x-transparent border-t-[var(--grey-900)]"
          />
        </div>
      )}

      {Array.from({ length: total }, (_, i) => {
        const isAnswered = answeredIndices.has(i);
        const isCurrent = i === currentIndex;
        const isClickable = isAnswered || isCurrent;
        const scale =
          hoverIndex !== null ? dockScale(i, hoverIndex, DOCK_MAX, DOCK_REACH) : 1;

        return (
          <button
            key={i}
            ref={(el) => { buttonRefs.current[i] = el; }}
            type="button"
            aria-label={`Question ${i + 1} of ${total}, ${isCurrent ? 'current' : isAnswered ? 'answered' : 'unanswered'}`}
            onClick={() => handleClick(i)}
            style={{
              transform: `scale(${scale})`,
              transition: 'transform 150ms ease-out',
            }}
            className={`${sizeClass}
              ${
                isCurrent
                  ? 'bg-[var(--color-core)] ring-2 ring-[var(--color-core-text)]/30'
                  : isAnswered
                    ? 'bg-[var(--color-core)]'
                    : 'bg-[var(--grey-100)]'
              }
              ${isClickable ? 'cursor-pointer' : 'cursor-default'}
              focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-core-text)]`}
          />
        );
      })}
    </div>
  );
}
