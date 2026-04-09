/**
 * Progress squares indicator for the survey question flow.
 * Grid of small squares showing answered/unanswered/current state.
 * Dock-style fisheye magnification on hover (cosine curve, reach=3, maxScale=2.4).
 * Clickable to jump to answered questions only.
 */
import { useCallback, useRef, useState } from 'react';

/** Dock-style scale: cosine falloff from pointer position, clamped to row boundaries. */
function dockScale(index: number, pointerIndex: number, maxScale: number, reach: number, rowStart: number, rowEnd: number): number {
  if (index < rowStart || index >= rowEnd || pointerIndex < rowStart || pointerIndex >= rowEnd) return 1;
  const dist = Math.abs(index - pointerIndex);
  if (dist > reach) return 1;
  const t = 1 - dist / reach;
  return 1 + ((maxScale - 1) * (Math.cos(Math.PI * (1 - t)) + 1)) / 2;
}

const DOCK_MAX = 1.5;
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

/** Compute square base size (px) and gap based on total question count. */
function squareLayout(total: number): { baseSize: number; gap: number; radius: number } {
  if (total > 60) return { baseSize: 16, gap: 6, radius: 3 };
  if (total > 40) return { baseSize: 20, gap: 8, radius: 3 };
  return { baseSize: 24, gap: 3, radius: 3 };
}

const SQUARES_PER_ROW = 20;

/**
 * Dock-style magnification: hovered square scales up with cosine falloff
 * across neighboring squares, matching the macOS dock fisheye effect.
 * Zoom only applies to answered and current squares.
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
  const { baseSize, gap, radius } = squareLayout(total);

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

  // Which row the hovered square belongs to
  const hoverRowIdx = hoverIndex !== null ? Math.floor(hoverIndex / SQUARES_PER_ROW) : null;

  // Chunk squares into rows of SQUARES_PER_ROW
  const rows: number[][] = [];
  for (let i = 0; i < total; i += SQUARES_PER_ROW) {
    rows.push(Array.from({ length: Math.min(SQUARES_PER_ROW, total - i) }, (_, j) => i + j));
  }

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col items-center"
      style={{ gap: `${gap}px` }}
      role="group"
      aria-label="Survey progress"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {rows.map((row, rowIdx) => (
        <div
          key={rowIdx}
          className="relative flex items-center justify-center"
          style={{ gap: `${gap}px` }}
        >
          {/* Tooltip — clamped to stay within row bounds */}
          {/* eslint-disable-next-line @typescript-eslint/explicit-function-return-type */}
          {showTooltip && hoverRowIdx === rowIdx && hoverIndex !== null && (() => {
            const btn = buttonRefs.current[hoverIndex];
            const rowEl = btn?.parentElement;
            if (!btn || !rowEl) return null;
            const btnRect = btn.getBoundingClientRect();
            const rowRect = rowEl.getBoundingClientRect();
            const tooltipWidth = 280;
            const halfTooltip = tooltipWidth / 2;
            const centerX = btnRect.left - rowRect.left + btnRect.width / 2;
            // Clamp so tooltip doesn't overflow row edges
            const clampedLeft = Math.max(halfTooltip, Math.min(centerX, rowRect.width - halfTooltip));
            // Arrow still points at the square
            const arrowLeft = centerX - clampedLeft + halfTooltip;
            return (
              <div
                className="pointer-events-none absolute bottom-full z-10 mb-2 w-[280px] rounded-lg bg-[var(--grey-900)] px-3 py-2 text-xs text-white shadow-lg"
                style={{ left: clampedLeft, transform: 'translateX(-50%)' }}
              >
                <span className="mr-1.5 text-[10px] font-bold opacity-50">{hoverIndex + 1}</span>
                <span className="line-clamp-2">{questionTexts![hoverIndex]}</span>
                <div
                  className="absolute top-full border-x-[5px] border-t-[5px] border-x-transparent border-t-[var(--grey-900)]"
                  style={{ left: arrowLeft, transform: 'translateX(-50%)' }}
                />
              </div>
            );
          })()}
          {row.map((i) => {
            const isAnswered = answeredIndices.has(i);
            const isCurrent = i === currentIndex;
            const isClickable = isAnswered || isCurrent;
            const canZoom = isAnswered || isCurrent;
            const rowStart = rowIdx * SQUARES_PER_ROW;
            const rowEnd = rowStart + row.length;
            const scale =
              canZoom && hoverIndex !== null ? dockScale(i, hoverIndex, DOCK_MAX, DOCK_REACH, rowStart, rowEnd) : 1;
            const size = baseSize * scale;

            return (
              <button
                key={i}
                ref={(el) => { buttonRefs.current[i] = el; }}
                type="button"
                aria-label={`Question ${i + 1} of ${total}, ${isCurrent ? 'current' : isAnswered ? 'answered' : 'unanswered'}`}
                onClick={() => handleClick(i)}
                style={{
                  width: size,
                  height: size,
                  borderRadius: Math.max(2, radius * scale),
                  transition: 'width 150ms ease-out, height 150ms ease-out, border-radius 150ms ease-out',
                }}
                className={`shrink-0
                  ${
                    isCurrent
                      ? 'bg-[var(--grey-700)] ring-2 ring-[var(--grey-700)]/30'
                      : isAnswered
                        ? 'bg-[var(--grey-700)]'
                        : 'bg-[var(--grey-100)]'
                  }
                  ${isClickable ? 'cursor-pointer' : 'cursor-default'}
                  focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-interactive)]`}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
