import { describe, test, expect } from 'bun:test';

/**
 * Tests for client access query key factory.
 *
 * The hook itself is a thin TanStack Query wrapper — we test
 * the query key structure, not the hook.
 */

// clientAccessKeys is in its own module with no @tanstack dependencies
import { clientAccessKeys } from './client-access-keys.js';

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('clientAccessKeys', () => {
  test('all key is ["client-access"]', () => {
    expect(clientAccessKeys.all).toEqual(['client-access']);
  });

  test('org key includes orgId', () => {
    expect(clientAccessKeys.org('org-1')).toEqual(['client-access', 'org-1']);
  });

  test('org keys for different orgs are distinct', () => {
    const a = clientAccessKeys.org('org-1');
    const b = clientAccessKeys.org('org-2');
    expect(a).not.toEqual(b);
  });

  test('org key starts with the all prefix', () => {
    const orgKey = clientAccessKeys.org('org-1');
    expect(orgKey.slice(0, clientAccessKeys.all.length)).toEqual([...clientAccessKeys.all]);
  });
});
