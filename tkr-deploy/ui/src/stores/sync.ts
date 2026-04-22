/**
 * Sync store — loads `/api/secrets` on demand for the Secrets screen.
 *
 * Kept lazy on purpose: the vault + secrets response is cheap but not free,
 * and we don't need it unless the person actually navigates to /secrets.
 *
 * @module stores/sync
 */

import { signal, type Signal } from '@preact/signals';
import { apiFetch } from '../api.js';

/** Loose shape matching the `/api/secrets` response from B2. */
export interface SyncSecretsResponse {
  vault: {
    name: string;
    locked: boolean;
    secretCount: number;
  };
  secrets: Array<{
    name: string;
    maskedValue: string;
    outOfSync: boolean;
    targets: Array<{
      name: string;
      id: string;
      state:
        | 'synced'
        | 'missing'
        | 'differs'
        | 'not_applicable'
        | 'unverifiable';
    }>;
  }>;
}

export interface SyncState {
  data: SyncSecretsResponse | null;
  loading: boolean;
  error: string | null;
  loadedAt: number | null;
}

export const syncState$: Signal<SyncState> = signal<SyncState>({
  data: null,
  loading: false,
  error: null,
  loadedAt: null,
});

/**
 * Fetch (or refetch) `/api/secrets`. Sets `loading` during the request and
 * stores either `data` or a human-readable `error`.
 */
export async function loadSync(): Promise<void> {
  syncState$.value = { ...syncState$.value, loading: true, error: null };
  try {
    const data = await apiFetch<SyncSecretsResponse>('/api/secrets');
    syncState$.value = {
      data,
      loading: false,
      error: null,
      loadedAt: Date.now(),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    syncState$.value = {
      ...syncState$.value,
      loading: false,
      error: message,
    };
  }
}
