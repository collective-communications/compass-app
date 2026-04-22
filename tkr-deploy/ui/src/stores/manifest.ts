/**
 * Manifest store — one-shot fetch of `/api/manifest` at app boot.
 *
 * The new UI does not use the manifest to drive its nav (three hard-coded
 * task-shaped pills do that) — but the manifest still carries the dashboard
 * name displayed in the topbar, and future screens may key off provider ids.
 *
 * @module stores/manifest
 */

import { signal, type Signal } from '@preact/signals';
import { apiFetch } from '../api.js';
import type { ManifestResponse } from '../types.js';

/** Null until the first fetch resolves. */
export const manifest$: Signal<ManifestResponse | null> = signal<
  ManifestResponse | null
>(null);

let loading = false;

/** Load the manifest once; subsequent calls are no-ops. */
export async function loadManifest(): Promise<void> {
  if (manifest$.value !== null || loading) return;
  loading = true;
  try {
    const data = await apiFetch<ManifestResponse>('/api/manifest');
    manifest$.value = data;
  } catch {
    // Fallback shape so the shell can still render.
    manifest$.value = { name: 'tkr-deploy', screens: [] };
  } finally {
    loading = false;
  }
}
