import { rename } from 'node:fs/promises';
import type { ActivityLogEntry } from '../types/activity.js';

/** Maximum gap between two v1 entries to treat them as the same synthetic run. */
const RUN_PROXIMITY_MS = 30_000;

/** Result of a migration pass. Both counts are zero when nothing changed. */
export interface MigrationResult {
  /** Number of v1 entries rewritten with a synthetic `runId` + `trigger`. */
  migrated: number;
  /** Number of synthetic runs created (one per cluster). */
  runs: number;
}

/**
 * One-shot migration for the JSONL activity log.
 *
 * The v2 orchestrator writes entries with `runId`, `trigger`, and `kind`. v1
 * entries (from earlier builds) have none of these. This function clusters v1
 * entries by timestamp proximity (≤{@link RUN_PROXIMITY_MS} gap between
 * consecutive entries forms one run), synthesizes a `runId` of the form
 * `legacy-<firstTimestampMs>`, and rewrites the file atomically.
 *
 * Rules:
 *
 * - If the file is missing, returns `{ migrated: 0, runs: 0 }`.
 * - If every non-blank entry already has a `runId`, returns `{ migrated: 0, runs: 0 }`
 *   — the operation is idempotent.
 * - Blank lines and unparsable rows are silently skipped (one console warning
 *   is emitted for each unparsable row).
 * - v2 entries (those that already have `runId`) are written back untouched.
 * - Synthesized entries get `trigger: 'full'`; `kind` is intentionally left
 *   absent — v1 entries are all step-level.
 * - Rewrites atomically via `<logPath>.new` + rename so a crash mid-write
 *   cannot leave a half-migrated file.
 *
 * Safe to call on every boot — checks the "all have runId" fast path before
 * doing any work.
 */
export async function migrateActivityLog(
  logPath: string,
): Promise<MigrationResult> {
  const file = Bun.file(logPath);
  if (!(await file.exists())) {
    return { migrated: 0, runs: 0 };
  }

  const text = await file.text();
  const rawLines = text.split('\n');

  const entries: ActivityLogEntry[] = [];
  let warnedUnparsable = false;
  for (const line of rawLines) {
    if (!line.trim()) continue;
    try {
      entries.push(JSON.parse(line) as ActivityLogEntry);
    } catch {
      if (!warnedUnparsable) {
        // eslint-disable-next-line no-console
        console.warn(
          `[activity-migrate] skipping unparsable row(s) in ${logPath}`,
        );
        warnedUnparsable = true;
      }
    }
  }

  if (entries.length === 0) {
    return { migrated: 0, runs: 0 };
  }

  // Idempotence fast-path — if every entry already has runId, do nothing.
  if (entries.every((e) => typeof e.runId === 'string' && e.runId.length > 0)) {
    return { migrated: 0, runs: 0 };
  }

  // Partition: v2 entries pass through untouched; v1 entries get clustered.
  const v2: ActivityLogEntry[] = [];
  const v1: ActivityLogEntry[] = [];
  for (const entry of entries) {
    if (entry.runId) {
      v2.push(entry);
    } else {
      v1.push(entry);
    }
  }

  v1.sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1));

  // Cluster v1 entries by timestamp proximity. Within a cluster every
  // consecutive pair is ≤ RUN_PROXIMITY_MS apart; a larger gap starts a new
  // synthetic run.
  const clusters: ActivityLogEntry[][] = [];
  let current: ActivityLogEntry[] = [];
  let lastTs = -Infinity;
  for (const entry of v1) {
    const ts = Date.parse(entry.timestamp);
    if (current.length === 0 || (Number.isFinite(ts) && ts - lastTs <= RUN_PROXIMITY_MS)) {
      current.push(entry);
    } else {
      clusters.push(current);
      current = [entry];
    }
    lastTs = ts;
  }
  if (current.length > 0) clusters.push(current);

  // Synthesize runId + trigger for every clustered entry.
  const migrated: ActivityLogEntry[] = [];
  for (const cluster of clusters) {
    const firstTs = Date.parse(cluster[0]!.timestamp);
    const runId = `legacy-${Number.isFinite(firstTs) ? firstTs : 'unknown'}`;
    for (const entry of cluster) {
      migrated.push({ ...entry, runId, trigger: 'full' });
    }
  }

  // Preserve original file order: v2 entries already in place, v1 entries
  // re-emitted in timestamp order. Interleaving isn't perfectly preserved —
  // but v1 and v2 entries shouldn't coexist in a single file on first upgrade,
  // so this is a reasonable compromise.
  const combined = [...v2, ...migrated];
  combined.sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1));

  const out = combined.map((e) => JSON.stringify(e)).join('\n') + '\n';
  const tmpPath = `${logPath}.new`;
  await Bun.write(tmpPath, out);
  await rename(tmpPath, logPath);

  return { migrated: migrated.length, runs: clusters.length };
}
