/**
 * Topbar — wordmark, project breadcrumb, ⌘K affordance, vault pill, user chip.
 *
 * Direction D layout: `tkr-deploy / compass-app / <section>` on the left,
 * with a vault status pill, a static ⌘K key chip, the theme toggle, and
 * a 26×26 user avatar square on the right.
 *
 * The current section is derived from `currentPath$` and the {@link RAIL_NAV}
 * table (single source of truth for path → label).
 *
 * @module shell/Topbar
 */

import type { JSX } from 'preact';
import { manifest$ } from '../stores/manifest.js';
import { currentPath$ } from '../router.js';
import { ThemeToggle } from './ThemeToggle.js';
import { VaultStatus } from './VaultStatus.js';
import { RAIL_NAV } from './RunRail.js';

const PROJECT_NAME = 'compass-app';

/** Map current path to its section label. */
function sectionLabel(path: string): string | null {
  const item = RAIL_NAV.find((i) => i.path === path);
  return item ? item.label : null;
}

export function Topbar(): JSX.Element {
  const wordmark = manifest$.value?.name ?? 'tkr-deploy';
  const path = currentPath$.value;
  const section = sectionLabel(path);

  return (
    <header class="shell-topbar">
      <div class="shell-topbar__breadcrumb">
        <span class="shell-topbar__wordmark">{wordmark}</span>
        <span class="shell-topbar__breadcrumb-sep" aria-hidden="true">/</span>
        <span class="shell-topbar__breadcrumb-project">{PROJECT_NAME}</span>
        {section !== null && (
          <>
            <span class="shell-topbar__breadcrumb-sep" aria-hidden="true">/</span>
            <span class="shell-topbar__breadcrumb-section">{section}</span>
          </>
        )}
      </div>

      <div class="shell-topbar__right">
        <VaultStatus />
        <span class="shell-topbar__divider" aria-hidden="true" />
        <span class="kbd" aria-hidden="true">⌘K</span>
        <ThemeToggle />
        <span class="shell-topbar__user" aria-label="User menu" title="User menu">
          TK
        </span>
      </div>
    </header>
  );
}
