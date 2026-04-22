/**
 * Theme store — signal-backed port of the legacy `theme.ts`.
 *
 * Shares the `tkr-theme` localStorage key with tkr-secrets so the same
 * preference round-trips across tools. Falls back to
 * `prefers-color-scheme` and keeps a live listener so system changes
 * propagate when the user has no explicit override.
 *
 * @module stores/theme
 */

import { signal, type Signal } from '@preact/signals';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'tkr-theme';

/** Reactive theme signal — UI components read this, don't read the DOM. */
export const theme$: Signal<Theme> = signal<Theme>('light');

let initialized = false;

function applyToDom(next: Theme): void {
  document.documentElement.dataset.theme = next;
}

/**
 * Initialize the theme system once per app boot.
 *
 * Resolution order:
 *  1. Explicit override from `localStorage['tkr-theme']`
 *  2. System preference via `prefers-color-scheme`
 *
 * When no explicit override exists, a live media-query listener keeps the
 * signal in sync with the OS preference until the user toggles manually.
 */
export function initTheme(): void {
  if (initialized) return;
  initialized = true;

  const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initial: Theme = stored ?? (prefersDark ? 'dark' : 'light');

  theme$.value = initial;
  applyToDom(initial);

  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', (e: MediaQueryListEvent) => {
      if (!localStorage.getItem(STORAGE_KEY)) {
        const next: Theme = e.matches ? 'dark' : 'light';
        theme$.value = next;
        applyToDom(next);
      }
    });
}

/**
 * Toggle between light and dark. Persists to localStorage so the choice
 * survives reload and wins over system preference from that point on.
 */
export function toggleTheme(): void {
  const next: Theme = theme$.value === 'dark' ? 'light' : 'dark';
  theme$.value = next;
  applyToDom(next);
  localStorage.setItem(STORAGE_KEY, next);
}
