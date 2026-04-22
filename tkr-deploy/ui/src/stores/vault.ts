/**
 * Vault status store — polls `/api/health` every 30s to keep the topbar dot
 * in sync with the real vault state. Single shared poller for the whole app.
 *
 * @module stores/vault
 */

import { signal, type Signal } from '@preact/signals';
import { apiFetch } from '../api.js';
import type { DotStatus, HealthResponse } from '../types.js';

/** Shape consumed by the topbar VaultStatus component. */
export interface VaultState {
  status: DotStatus;
  label: string;
}

/** Reactive vault status; starts in `unknown` until the first poll resolves. */
export const vault$: Signal<VaultState> = signal<VaultState>({
  status: 'unknown',
  label: 'checking...',
});

const POLL_MS = 30_000;
let interval: ReturnType<typeof setInterval> | null = null;

function mapHealthToStatus(data: HealthResponse): VaultState {
  if (data.vaultLocked === false) return { status: 'healthy', label: 'unlocked' };
  if (data.vaultLocked === true) return { status: 'warning', label: 'locked' };
  return { status: 'unknown', label: 'unknown' };
}

async function pollOnce(): Promise<void> {
  try {
    const data = await apiFetch<HealthResponse>('/api/health');
    vault$.value = mapHealthToStatus(data);
  } catch {
    vault$.value = { status: 'unknown', label: 'unreachable' };
  }
}

/** Start the poller. Idempotent — calling twice is a no-op. */
export function startVaultPolling(): void {
  if (interval !== null) return;
  void pollOnce();
  interval = setInterval(() => void pollOnce(), POLL_MS);
}

/** Stop the poller. Useful for tests. */
export function stopVaultPolling(): void {
  if (interval !== null) {
    clearInterval(interval);
    interval = null;
  }
}
