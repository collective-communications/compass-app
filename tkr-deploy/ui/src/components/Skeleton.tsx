/**
 * Skeleton — shared loading placeholder. Replaces the per-screen reinvention
 * used across the legacy `ui/src/screens/*`. Pure CSS pulse via the existing
 * `.skeleton` class (added in this PR if not already present).
 *
 * @module components/Skeleton
 */

import type { JSX } from 'preact';

export interface SkeletonProps {
  /** Width in CSS units. Default `100%`. */
  width?: string;
  /** Height in CSS units. Default `1em`. */
  height?: string;
  /** Override border-radius. Default `var(--radius-button)`. */
  radius?: string;
  ariaLabel?: string;
}

export function Skeleton(props: SkeletonProps): JSX.Element {
  const {
    width = '100%',
    height = '1em',
    radius,
    ariaLabel = 'Loading',
  } = props;
  const style: Record<string, string> = { width, height };
  if (radius !== undefined) style.borderRadius = radius;
  return <span class="skeleton" style={style} role="status" aria-label={ariaLabel} />;
}
