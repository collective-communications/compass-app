/**
 * Score change badge showing directional trend with arrow and percentage.
 * Uses both color and shape to communicate direction (accessible without color).
 */

import type { ReactElement } from 'react';

interface TrendIndicatorProps {
  delta: number | null;
  size?: 'sm' | 'md';
}

const sizeClasses: Record<'sm' | 'md', string> = {
  sm: 'text-xs',
  md: 'text-sm',
};

export function TrendIndicator({
  delta,
  size = 'md',
}: TrendIndicatorProps): ReactElement | null {
  if (delta === null) {
    return null;
  }

  const base = sizeClasses[size];

  if (delta === 0) {
    return (
      <span className={`${base} font-medium text-[var(--grey-500)]`} aria-label="No change">
        —
      </span>
    );
  }

  const isPositive = delta > 0;
  const arrow = isPositive ? '↑' : '↓';
  const color = isPositive ? 'text-[#2E7D32]' : 'text-[#C62828]';
  const sign = isPositive ? '+' : '';
  const direction = isPositive ? 'increased' : 'decreased';
  const label = `Score ${direction} by ${Math.abs(delta)} percent`;

  return (
    <span className={`${base} font-medium ${color}`} aria-label={label}>
      {arrow} {sign}{delta}%
    </span>
  );
}
