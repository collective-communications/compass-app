import { describe, test, expect } from 'bun:test';

/**
 * Tests for recipient query key factory and hook configuration.
 *
 * The hooks themselves are thin TanStack Query wrappers — we test
 * the query key structure and invalidation patterns, not the hooks.
 */

// recipientKeys is in its own module with no @tanstack dependencies
import { recipientKeys } from './recipient-keys.js';

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('recipientKeys', () => {
  test('all key is ["admin", "recipients"]', () => {
    expect(recipientKeys.all).toEqual(['admin', 'recipients']);
  });

  test('list key includes surveyId', () => {
    expect(recipientKeys.list('survey-1')).toEqual([
      'admin', 'recipients', 'list', 'survey-1',
    ]);
  });

  test('stats key includes surveyId', () => {
    expect(recipientKeys.stats('survey-2')).toEqual([
      'admin', 'recipients', 'stats', 'survey-2',
    ]);
  });

  test('list keys for different surveys are distinct', () => {
    const a = recipientKeys.list('s-1');
    const b = recipientKeys.list('s-2');
    expect(a).not.toEqual(b);
  });

  test('list and stats keys for same survey are distinct', () => {
    const list = recipientKeys.list('s-1');
    const stats = recipientKeys.stats('s-1');
    expect(list).not.toEqual(stats);
  });
});
