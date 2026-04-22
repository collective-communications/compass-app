/**
 * PillNav — three hard-coded task-shaped pills: Deploy | Secrets | History.
 *
 * The legacy UI derived its nav from `/api/manifest.screens` (provider-per-
 * tab). The new UI is task-shaped, not provider-shaped, so the nav is fixed
 * here and the manifest drives other things (dashboard name, per-provider
 * metadata) rather than nav wiring.
 *
 * @module shell/PillNav
 */

import type { JSX } from 'preact';
import { currentPath$, navigate } from '../router.js';

export interface PillItem {
  label: string;
  path: string;
}

/** Exported for reuse by the router bootstrap in `app.tsx`. */
export const NAV_ITEMS: readonly PillItem[] = [
  { label: 'Deploy', path: '/' },
  { label: 'Secrets', path: '/secrets' },
  { label: 'History', path: '/history' },
] as const;

export function PillNav(): JSX.Element {
  const active = currentPath$.value;

  return (
    <nav class="shell-pillnav" aria-label="Main navigation">
      {NAV_ITEMS.map((item) => {
        const isActive = item.path === active;
        return (
          <a
            key={item.path}
            class="shell-pill"
            href={item.path}
            aria-current={isActive ? 'page' : undefined}
            onClick={(e: MouseEvent) => {
              e.preventDefault();
              navigate(item.path);
            }}
          >
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}
