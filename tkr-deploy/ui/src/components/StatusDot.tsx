/**
 * StatusDot — coloured circle + optional label.
 *
 * @module components/StatusDot
 */

import type { JSX } from 'preact';
import type { DotStatus } from '../types.js';

export interface StatusDotProps {
  status: DotStatus;
  label?: string;
}

export function StatusDot(props: StatusDotProps): JSX.Element {
  const { status, label } = props;
  return (
    <span class="status-dot">
      <span
        class={`status-dot__circle status-dot__circle--${status}`}
        aria-hidden="true"
      />
      {label !== undefined && <span>{label}</span>}
    </span>
  );
}
