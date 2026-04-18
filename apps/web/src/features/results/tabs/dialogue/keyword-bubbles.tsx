/**
 * Keyword bubble cloud — renders keywords as SVG circles sized by frequency.
 * Uses a simple circle-packing layout: largest circle centered, smaller ones arranged radially.
 * Click a bubble to filter responses containing that keyword.
 * Max 30 keywords displayed, radius scaled between 24px and 64px.
 */

import { useMemo, useState, type ReactElement } from 'react';

/** Single keyword with its occurrence count. */
export interface Keyword {
  text: string;
  count: number;
}

interface KeywordBubblesProps {
  keywords: Keyword[];
  activeKeyword: string | null;
  onKeywordClick: (keyword: string | null) => void;
}

const MIN_RADIUS = 24;
const MAX_RADIUS = 64;
const MAX_KEYWORDS = 30;
const PADDING = 4;

interface PackedCircle {
  x: number;
  y: number;
  r: number;
  keyword: Keyword;
}

/** Compute radius from count, linearly interpolated. */
function getRadius(count: number, minCount: number, maxCount: number): number {
  if (maxCount === minCount) return (MIN_RADIUS + MAX_RADIUS) / 2;
  const ratio = (count - minCount) / (maxCount - minCount);
  return MIN_RADIUS + ratio * (MAX_RADIUS - MIN_RADIUS);
}

/** Check if a candidate circle overlaps any placed circles. */
function overlaps(candidate: PackedCircle, placed: PackedCircle[]): boolean {
  for (const c of placed) {
    const dx = candidate.x - c.x;
    const dy = candidate.y - c.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < candidate.r + c.r + PADDING) return true;
  }
  return false;
}

/** Simple circle packing: place largest first at center, then spiral outward. */
function packCircles(keywords: Keyword[], minCount: number, maxCount: number): PackedCircle[] {
  const sorted = [...keywords].sort((a, b) => b.count - a.count);
  const placed: PackedCircle[] = [];

  for (const keyword of sorted) {
    const r = getRadius(keyword.count, minCount, maxCount);

    if (placed.length === 0) {
      placed.push({ x: 0, y: 0, r, keyword });
      continue;
    }

    // Spiral outward to find a non-overlapping position
    let bestCircle: PackedCircle | null = null;
    for (let dist = r; dist < 800; dist += 2) {
      const steps = Math.max(12, Math.floor((2 * Math.PI * dist) / (r * 0.8)));
      const angleOffset = placed.length * 0.7; // vary starting angle per circle
      for (let s = 0; s < steps; s++) {
        const angle = angleOffset + (2 * Math.PI * s) / steps;
        const candidate: PackedCircle = {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist,
          r,
          keyword,
        };
        if (!overlaps(candidate, placed)) {
          bestCircle = candidate;
          break;
        }
      }
      if (bestCircle) break;
    }

    if (bestCircle) {
      placed.push(bestCircle);
    }
  }

  return placed;
}

/** Font size that fits inside the circle, clamped. */
function getFontSize(radius: number, textLength: number): number {
  // Approximate: width of text ~ textLength * fontSize * 0.6
  // Must fit in diameter: textLength * fontSize * 0.6 < 2 * radius * 0.85
  const maxByWidth = (2 * radius * 0.8) / (textLength * 0.55);
  const maxByHeight = radius * 0.7;
  return Math.max(9, Math.min(maxByWidth, maxByHeight, 16));
}

/** Keyword bubble cloud sized by frequency, rendered as SVG circles. */
export function KeywordBubbles({
  keywords,
  activeKeyword,
  onKeywordClick,
}: KeywordBubblesProps): ReactElement {
  const displayed = useMemo(() => {
    const sorted = [...keywords].sort((a, b) => b.count - a.count);
    return sorted.slice(0, MAX_KEYWORDS);
  }, [keywords]);

  const { minCount, maxCount } = useMemo(() => {
    if (displayed.length === 0) return { minCount: 0, maxCount: 0 };
    const counts = displayed.map((k) => k.count);
    return { minCount: Math.min(...counts), maxCount: Math.max(...counts) };
  }, [displayed]);

  const circles = useMemo(
    () => packCircles(displayed, minCount, maxCount),
    [displayed, minCount, maxCount],
  );

  const [focusIndex, setFocusIndex] = useState<number | null>(null);

  const viewBox = useMemo(() => {
    if (circles.length === 0) return { x: 0, y: 0, w: 100, h: 100 };
    let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
    for (const c of circles) {
      xMin = Math.min(xMin, c.x - c.r);
      xMax = Math.max(xMax, c.x + c.r);
      yMin = Math.min(yMin, c.y - c.r);
      yMax = Math.max(yMax, c.y + c.r);
    }
    const pad = 8;
    return { x: xMin - pad, y: yMin - pad, w: xMax - xMin + 2 * pad, h: yMax - yMin + 2 * pad };
  }, [circles]);

  if (displayed.length === 0) return <div />;

  return (
    <svg
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
      className="w-full"
      style={{ maxHeight: '400px' }}
      role="group"
      aria-label="Keyword filters"
    >
      {circles.map((circle, i) => {
        const isActive = activeKeyword === circle.keyword.text;
        const isFocused = focusIndex === i;
        const fontSize = getFontSize(circle.r, circle.keyword.text.length);

        return (
          <g
            key={circle.keyword.text}
            role="button"
            tabIndex={0}
            aria-label={`Filter by ${circle.keyword.text}, mentioned ${circle.keyword.count} times`}
            aria-pressed={isActive}
            onClick={() => onKeywordClick(isActive ? null : circle.keyword.text)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onKeywordClick(isActive ? null : circle.keyword.text);
              }
            }}
            onFocus={() => setFocusIndex(i)}
            onBlur={() => setFocusIndex(null)}
            className="cursor-pointer focus:outline-none"
          >
            <circle
              cx={circle.x}
              cy={circle.y}
              r={circle.r}
              fill={isActive ? 'var(--grey-700)' : 'var(--grey-50)'}
              stroke={isActive ? 'var(--grey-700)' : 'var(--grey-200, #E5E4E0)'}
              strokeWidth={1}
            />
            {isFocused && (
              <circle
                cx={circle.x}
                cy={circle.y}
                r={circle.r + 3}
                fill="none"
                stroke="var(--color-interactive)"
                strokeWidth={2}
                pointerEvents="none"
              />
            )}
            <text
              x={circle.x}
              y={circle.y}
              textAnchor="middle"
              dominantBaseline="central"
              fill={isActive ? '#FFFFFF' : 'var(--grey-700)'}
              fontSize={fontSize}
              fontFamily="inherit"
              pointerEvents="none"
            >
              {circle.keyword.text}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
