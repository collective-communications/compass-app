/**
 * Topbar — dashboard wordmark, theme toggle, vault status.
 *
 * Mirrors the legacy `shell.ts` topbar layout so existing CSS (no new tokens)
 * continues to apply.
 *
 * @module shell/Topbar
 */

import type { JSX } from 'preact';
import { manifest$ } from '../stores/manifest.js';
import { ThemeToggle } from './ThemeToggle.js';
import { VaultStatus } from './VaultStatus.js';

export function Topbar(): JSX.Element {
  const name = manifest$.value?.name ?? 'tkr-deploy';
  return (
    <header class="shell-topbar">
      <span class="shell-topbar__wordmark">{name}</span>
      <div class="shell-topbar__right">
        <ThemeToggle />
        <VaultStatus />
      </div>
    </header>
  );
}
