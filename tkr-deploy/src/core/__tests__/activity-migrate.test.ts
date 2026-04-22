import { describe, test, expect } from 'bun:test';
import { migrateActivityLog } from '../activity-migrate.js';
import type { ActivityLogEntry } from '../../types/activity.js';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function tmpLogPath(): string {
  const dir = mkdtempSync(join(tmpdir(), 'migrate-'));
  return join(dir, 'activity.jsonl');
}

function writeEntries(path: string, entries: ActivityLogEntry[]): void {
  const content = entries.map((e) => JSON.stringify(e)).join('\n') + '\n';
  writeFileSync(path, content);
}

function readEntries(path: string): ActivityLogEntry[] {
  const text = readFileSync(path, 'utf-8');
  return text
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as ActivityLogEntry);
}

function makeV1Entry(timestampMs: number, action: string): ActivityLogEntry {
  return {
    timestamp: new Date(timestampMs).toISOString(),
    action,
    provider: 'test',
    status: 'success',
  };
}

function makeV2Entry(
  timestampMs: number,
  action: string,
  runId: string,
): ActivityLogEntry {
  return {
    timestamp: new Date(timestampMs).toISOString(),
    action,
    provider: 'test',
    status: 'success',
    runId,
    trigger: 'full',
    kind: 'step',
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('migrateActivityLog', () => {
  test('migrates v1 entries (no runId) into synthetic runs grouped by <=30s proximity', async () => {
    const path = tmpLogPath();
    const baseTime = Date.parse('2026-01-15T12:00:00.000Z');

    // Three entries within 30s = one cluster
    writeEntries(path, [
      makeV1Entry(baseTime, 'syncSecrets'),
      makeV1Entry(baseTime + 5_000, 'pushMigrations'),
      makeV1Entry(baseTime + 10_000, 'deployFunctions'),
    ]);

    const result = await migrateActivityLog(path);

    expect(result.migrated).toBe(3);
    expect(result.runs).toBe(1);

    const entries = readEntries(path);
    expect(entries).toHaveLength(3);
    // All should share the same synthetic runId
    const runIds = new Set(entries.map((e) => e.runId));
    expect(runIds.size).toBe(1);
    const runId = entries[0]!.runId!;
    expect(runId).toMatch(/^legacy-/);
    // All should have trigger: 'full'
    for (const entry of entries) {
      expect(entry.trigger).toBe('full');
    }
  });

  test('multiple v1 entry clusters get different synthetic runIds', async () => {
    const path = tmpLogPath();
    const baseTime = Date.parse('2026-01-15T12:00:00.000Z');

    // Cluster 1: 3 entries within 30s
    // Cluster 2: 2 entries starting 60s later (gap > 30s)
    writeEntries(path, [
      makeV1Entry(baseTime, 'syncSecrets'),
      makeV1Entry(baseTime + 5_000, 'pushMigrations'),
      makeV1Entry(baseTime + 10_000, 'deployFunctions'),
      makeV1Entry(baseTime + 60_000, 'triggerRedeploy'),
      makeV1Entry(baseTime + 65_000, 'healthCheck'),
    ]);

    const result = await migrateActivityLog(path);

    expect(result.migrated).toBe(5);
    expect(result.runs).toBe(2);

    const entries = readEntries(path);
    const runIds = [...new Set(entries.map((e) => e.runId))];
    expect(runIds).toHaveLength(2);
    expect(runIds[0]).not.toBe(runIds[1]);

    // First three should share one runId
    expect(entries[0]!.runId).toBe(entries[1]!.runId);
    expect(entries[1]!.runId).toBe(entries[2]!.runId);
    // Last two should share a different runId
    expect(entries[3]!.runId).toBe(entries[4]!.runId);
    expect(entries[0]!.runId).not.toBe(entries[3]!.runId);
  });

  test('entries that already have runId are passed through unchanged', async () => {
    const path = tmpLogPath();
    const baseTime = Date.parse('2026-01-15T12:00:00.000Z');

    const v2Entry = makeV2Entry(baseTime, 'syncSecrets', 'existing-run-abc');
    const v1Entry = makeV1Entry(baseTime + 60_000, 'pushMigrations');

    writeEntries(path, [v2Entry, v1Entry]);

    const result = await migrateActivityLog(path);

    expect(result.migrated).toBe(1); // Only the v1 entry
    expect(result.runs).toBe(1);

    const entries = readEntries(path);
    expect(entries).toHaveLength(2);

    // v2 entry should be untouched
    const existing = entries.find((e) => e.runId === 'existing-run-abc');
    expect(existing).toBeTruthy();
    expect(existing!.action).toBe('syncSecrets');
    expect(existing!.trigger).toBe('full');
    expect(existing!.kind).toBe('step');

    // v1 entry should have a synthetic runId
    const migrated = entries.find((e) => e.runId !== 'existing-run-abc');
    expect(migrated).toBeTruthy();
    expect(migrated!.runId).toMatch(/^legacy-/);
    expect(migrated!.trigger).toBe('full');
  });

  test('idempotent: running twice produces identical output', async () => {
    const path = tmpLogPath();
    const baseTime = Date.parse('2026-01-15T12:00:00.000Z');

    writeEntries(path, [
      makeV1Entry(baseTime, 'syncSecrets'),
      makeV1Entry(baseTime + 5_000, 'pushMigrations'),
    ]);

    const result1 = await migrateActivityLog(path);
    expect(result1.migrated).toBe(2);
    expect(result1.runs).toBe(1);

    const entriesAfterFirst = readEntries(path);

    // Run again — all entries now have runId, so it should be a no-op
    const result2 = await migrateActivityLog(path);
    expect(result2.migrated).toBe(0);
    expect(result2.runs).toBe(0);

    const entriesAfterSecond = readEntries(path);
    expect(entriesAfterSecond).toEqual(entriesAfterFirst);
  });

  test('missing file returns { migrated: 0, runs: 0 }', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'migrate-'));
    const nonExistentPath = join(dir, 'does-not-exist.jsonl');

    const result = await migrateActivityLog(nonExistentPath);

    expect(result.migrated).toBe(0);
    expect(result.runs).toBe(0);
  });

  test('blank lines and malformed JSON are skipped gracefully', async () => {
    const path = tmpLogPath();
    const baseTime = Date.parse('2026-01-15T12:00:00.000Z');

    const validEntry = makeV1Entry(baseTime, 'syncSecrets');
    const content = [
      '',
      JSON.stringify(validEntry),
      '   ',
      'this is not valid json {{{',
      JSON.stringify(makeV1Entry(baseTime + 5_000, 'pushMigrations')),
      '',
    ].join('\n');
    writeFileSync(path, content);

    const result = await migrateActivityLog(path);

    // Only the 2 valid entries should be migrated
    expect(result.migrated).toBe(2);
    expect(result.runs).toBe(1);

    const entries = readEntries(path);
    expect(entries).toHaveLength(2);
    expect(entries[0]!.action).toBe('syncSecrets');
    expect(entries[1]!.action).toBe('pushMigrations');
  });

  test('empty file returns { migrated: 0, runs: 0 }', async () => {
    const path = tmpLogPath();
    writeFileSync(path, '');

    const result = await migrateActivityLog(path);

    expect(result.migrated).toBe(0);
    expect(result.runs).toBe(0);
  });
});
