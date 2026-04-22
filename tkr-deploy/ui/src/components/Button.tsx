/**
 * Button — preact port of the legacy `components/button.ts`.
 *
 * Shows a spinner + disabled state while an async `onClick` resolves.
 * Uses the existing `.btn`, `.btn--primary`, `.btn--secondary`, and
 * `.btn--loading` classes from `ui/styles.css`.
 *
 * @module components/Button
 */

import type { ComponentChildren, JSX } from 'preact';
import { useState, useCallback } from 'preact/hooks';

export interface ButtonProps {
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  ariaLabel?: string;
  onClick?: (e: MouseEvent) => void | Promise<void>;
  children: ComponentChildren;
}

export function Button(props: ButtonProps): JSX.Element {
  const {
    variant = 'primary',
    disabled = false,
    type = 'button',
    ariaLabel,
    onClick,
    children,
  } = props;

  const [loading, setLoading] = useState(false);

  const handleClick = useCallback(
    (e: MouseEvent) => {
      if (!onClick) return;
      const result = onClick(e);
      if (result instanceof Promise) {
        setLoading(true);
        result.finally(() => setLoading(false));
      }
    },
    [onClick],
  );

  const classes = [
    'btn',
    `btn--${variant}`,
    loading ? 'btn--loading' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      class={classes}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      onClick={handleClick}
    >
      <span class="btn__label">{children}</span>
      {loading && <span class="btn__spinner" aria-hidden="true" />}
    </button>
  );
}
