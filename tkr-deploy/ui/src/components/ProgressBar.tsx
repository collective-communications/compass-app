/**
 * ProgressBar — accessible 0–100% fill bar.
 *
 * @module components/ProgressBar
 */

import type { JSX } from 'preact';

export interface ProgressBarProps {
  value: number;
  max: number;
  ariaLabel?: string;
}

export function ProgressBar(props: ProgressBarProps): JSX.Element {
  const { value, max, ariaLabel } = props;
  const safeMax = max > 0 ? max : 0;
  const pct = safeMax > 0 ? Math.min(100, (value / safeMax) * 100) : 0;

  return (
    <div
      class="progress-bar"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuenow={value}
      aria-label={ariaLabel ?? `${Math.round(pct)}% complete`}
    >
      <div class="progress-bar__fill" style={{ width: `${pct}%` }} />
    </div>
  );
}
