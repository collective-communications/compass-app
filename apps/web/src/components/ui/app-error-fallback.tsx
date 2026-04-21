/**
 * Shared error-fallback card used across app shells and feature pages.
 *
 * Renders the same red-outlined card visual used in the dashboard error
 * block, normalising arbitrary `unknown` errors into a displayable string.
 * When an `onRetry` callback is provided, a subtle outline-style Retry
 * button is rendered and wired to it.
 */

import type { ReactElement } from 'react';

/**
 * Props accepted by {@link AppErrorFallback}.
 *
 * @property error   - Arbitrary error value. `Error` instances use `.message`;
 *                     strings render as-is; plain objects are `JSON.stringify`-ed;
 *                     anything non-serialisable falls back to `'Unknown error'`.
 * @property onRetry - Optional callback. When present, a Retry button is rendered.
 * @property title   - Optional heading text. Defaults to `'Something went wrong'`.
 */
export type AppErrorFallbackProps = {
  error: unknown;
  onRetry?: () => void;
  title?: string;
};

/**
 * Normalise an unknown error value into a user-displayable string.
 *
 * Prefers `Error.message` for {@link Error} instances, uses strings as-is,
 * and falls back to `JSON.stringify` for plain objects. Any failure (such
 * as a circular structure) yields the literal `'Unknown error'`.
 */
function normaliseErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown error';
  }
}

/**
 * Shared error-state card.
 *
 * Matches the red-outlined dashboard fallback tokens
 * (`--feedback-error-border`, `--feedback-error-bg`, `--feedback-error-text`).
 */
export function AppErrorFallback(props: AppErrorFallbackProps): ReactElement {
  const { error, onRetry, title = 'Something went wrong' } = props;
  const message = normaliseErrorMessage(error);

  return (
    <div
      role="alert"
      className="rounded-lg border border-[var(--feedback-error-border)] bg-[var(--feedback-error-bg)] p-4"
    >
      <h2 className="text-sm font-semibold text-[var(--feedback-error-text)]">{title}</h2>
      <p className="mt-1 text-sm text-[var(--feedback-error-text)]">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 inline-flex items-center rounded-md border border-[var(--feedback-error-border)] bg-transparent px-3 py-1.5 text-sm text-[var(--feedback-error-text)] hover:bg-[var(--feedback-error-border)]/10 focus:outline-none focus:ring-2 focus:ring-[var(--feedback-error-border)]"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}
