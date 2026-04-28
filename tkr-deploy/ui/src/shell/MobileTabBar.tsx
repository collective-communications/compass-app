/**
 * MobileTabBar — bottom navigation tabs for mobile viewports.
 *
 * Direction D ships a 5-tab bar (Activity / Secrets / DB / Web / CI) keyed
 * to the same routes as the desktop {@link RunRail}. Active state uses the
 * cyan accent. Hidden ≥ 768px via CSS media query.
 *
 * @module shell/MobileTabBar
 */

import type { JSX } from 'preact';
import { currentPath$, navigate } from '../router.js';

export interface MobileTab {
  id: string;
  label: string;
  /** Icon glyph (single character — Plex Mono). */
  icon: string;
  path: string;
}

export const MOBILE_TABS: readonly MobileTab[] = [
  { id: 'overview', label: 'Activity', icon: '~', path: '/' },
  { id: 'secrets', label: 'Secrets', icon: '◇', path: '/secrets' },
  { id: 'database', label: 'DB', icon: '◐', path: '/database' },
  { id: 'frontend', label: 'Web', icon: '▲', path: '/frontend' },
  { id: 'cicd', label: 'CI', icon: '◆', path: '/cicd' },
] as const;

export function MobileTabBar(): JSX.Element {
  const active = currentPath$.value;
  return (
    <nav class="mob-tab" aria-label="Main navigation (mobile)">
      {MOBILE_TABS.map((t) => {
        const on = t.path === active;
        return (
          <a
            key={t.id}
            class={`mob-tab__item${on ? ' mob-tab__item--on' : ''}`}
            href={t.path}
            aria-current={on ? 'page' : undefined}
            onClick={(e: MouseEvent) => {
              e.preventDefault();
              navigate(t.path);
            }}
          >
            <span class="mob-tab__icon" aria-hidden="true">{t.icon}</span>
            <span>{t.label}</span>
          </a>
        );
      })}
    </nav>
  );
}
