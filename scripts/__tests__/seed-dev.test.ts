/**
 * Freshness checks for `seedDates` — the relative-date anchors that the dev
 * seed (`scripts/seed-dev.ts`) feeds into deployment `opens_at` / `closes_at`.
 *
 * If these assertions ever fail, the seed will produce deployment windows that
 * don't match their label (e.g. the "active" deployment would be expired), so
 * QA flows depending on an open window would silently break.
 *
 * NOTE: we import from `seed-dates.ts` (not `seed-dev.ts`) because the latter
 * runs a top-level `.env.local` loader that would exit the process in a CI
 * environment without the service-role key.
 */

import { test, expect } from 'bun:test';

import { seedDates } from '../seed-dates.ts';

test('activeOpens is in the past', () => {
  expect(new Date(seedDates().activeOpens).getTime()).toBeLessThan(Date.now());
});

test('activeCloses is in the future', () => {
  expect(new Date(seedDates().activeCloses).getTime()).toBeGreaterThan(Date.now());
});

test('expiredCloses is in the past', () => {
  expect(new Date(seedDates().expiredCloses).getTime()).toBeLessThan(Date.now());
});

test('futureOpens is in the future', () => {
  expect(new Date(seedDates().futureOpens).getTime()).toBeGreaterThan(Date.now());
});

test('expiredOpens precedes expiredCloses', () => {
  const d = seedDates();
  expect(new Date(d.expiredOpens).getTime()).toBeLessThan(
    new Date(d.expiredCloses).getTime(),
  );
});

test('futureOpens precedes futureCloses', () => {
  const d = seedDates();
  expect(new Date(d.futureOpens).getTime()).toBeLessThan(
    new Date(d.futureCloses).getTime(),
  );
});
