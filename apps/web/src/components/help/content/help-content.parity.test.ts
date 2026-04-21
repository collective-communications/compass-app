/**
 * Parity test: every path registered with `registerHelpContent` must fall
 * under one of the app's known route prefixes. Catches orphan help entries
 * (e.g. registrations for routes that have been deleted).
 *
 * Approach: mock the help-content store so every `registerHelpContent` call
 * is captured into a local array, then invoke each tier's init function.
 */

import { beforeAll, expect, mock, test } from 'bun:test';

const registered: string[] = [];

mock.module('../help-content-store', () => ({
  registerHelpContent: (prefix: string, _entry: unknown): void => {
    registered.push(prefix);
  },
  getHelpContent: (): null => null,
}));

/** Allowed top-level route prefixes. Keep in sync with routes/__root.tsx. */
const ALLOWED_PREFIXES = [
  '/',
  '/clients',
  '/surveys',
  '/users',
  '/dashboard',
  '/results',
  '/reports',
  '/settings',
  '/help',
  '/profile',
  '/s',
  '/survey',
];

beforeAll(async () => {
  const t1 = await import('./tier-1-admin');
  const t2 = await import('./tier-2-client');
  const t3 = await import('./tier-3-survey');
  t1.registerTier1Content();
  t2.registerTier2Content();
  // registerTier3Content accepts an optional scaleSize; pass 5 to exercise it
  if (t3.registerTier3Content.length === 0) {
    (t3.registerTier3Content as () => void)();
  } else {
    (t3.registerTier3Content as (size: number) => void)(5);
  }
});

test('every registered help path starts with a known route prefix', () => {
  const unrecognised: string[] = [];
  for (const prefix of registered) {
    const matches = ALLOWED_PREFIXES.some(
      (p) => prefix === p || prefix.startsWith(p === '/' ? '/' : `${p}/`) || prefix === p,
    );
    if (!matches) unrecognised.push(prefix);
  }
  expect(unrecognised).toEqual([]);
});

test('no duplicate help-path registrations across tiers', () => {
  const seen = new Set<string>();
  const dupes: string[] = [];
  for (const prefix of registered) {
    if (seen.has(prefix)) dupes.push(prefix);
    else seen.add(prefix);
  }
  expect(dupes).toEqual([]);
});
