/**
 * Unit tests for `isValidReturnTo` — the returnTo search-param validator that
 * protects the post-login redirect from open-redirect and host-injection
 * payloads.
 *
 * Covers URL-encoded and double-encoded path-traversal payloads that the
 * original raw-string check missed.
 */

import { describe, expect, test } from 'bun:test';
import { isValidReturnTo } from './use-auth';

describe('isValidReturnTo', () => {
  // ─── Happy paths ─────────────────────────────────────────────────────────

  test('accepts a simple absolute app path', () => {
    expect(isValidReturnTo('/dashboard')).toBe(true);
  });

  test('accepts a nested app path with query and hash', () => {
    expect(isValidReturnTo('/results/surveys/abc?tab=compass#top')).toBe(true);
  });

  test('accepts safe percent-encoded characters in segments', () => {
    // Space encoded as %20 — decodes to "/my dashboard", still safe.
    expect(isValidReturnTo('/my%20dashboard')).toBe(true);
  });

  // ─── Null / empty / non-string ───────────────────────────────────────────

  test('rejects empty string', () => {
    expect(isValidReturnTo('')).toBe(false);
  });

  test('rejects null', () => {
    expect(isValidReturnTo(null as unknown as string)).toBe(false);
  });

  test('rejects undefined', () => {
    expect(isValidReturnTo(undefined as unknown as string)).toBe(false);
  });

  test('rejects non-string input (number)', () => {
    expect(isValidReturnTo(42 as unknown as string)).toBe(false);
  });

  // ─── Raw protocol / host-injection attacks ──────────────────────────────

  test('rejects fully-qualified https URL', () => {
    expect(isValidReturnTo('https://evil.com/x')).toBe(false);
  });

  test('rejects protocol-relative URL (//host)', () => {
    expect(isValidReturnTo('//evil.com/x')).toBe(false);
  });

  test('rejects backslash-based host injection', () => {
    expect(isValidReturnTo('/\\evil.com')).toBe(false);
  });

  test('rejects paths that do not start with /', () => {
    expect(isValidReturnTo('dashboard')).toBe(false);
  });

  // ─── URL-encoded traversal — the actual regression surface ──────────────

  test('rejects URL-encoded //evil.com (%2F%2Fevil.com)', () => {
    // After one decode → "//evil.com", which then fails the //-prefix check.
    expect(isValidReturnTo('/%2F%2Fevil.com')).toBe(false);
  });

  test('rejects URL-encoded //evil.com at the root (%2F%2F…)', () => {
    // Raw form does not start with "/", so the raw check rejects immediately.
    expect(isValidReturnTo('%2F%2Fevil.com')).toBe(false);
  });

  test('rejects URL-encoded /\\ host injection (%2F%5Cevil.com)', () => {
    // Decoded: "/\\evil.com" — backslash appears after decode.
    expect(isValidReturnTo('/%2F%5Cevil.com')).toBe(false);
  });

  test('rejects URL-encoded protocol (https%3A%2F%2Fevil.com)', () => {
    expect(isValidReturnTo('/https%3A%2F%2Fevil.com')).toBe(false);
  });

  // ─── Double-encoded traversal ───────────────────────────────────────────

  test('rejects double-encoded // (%252F%252Fevil.com)', () => {
    // First decode → "%2F%2Fevil.com"; second decode → "//evil.com".
    // Iterative decode is required — a single decodeURIComponent pass
    // would still see "%2F%2Fevil.com", which is not literal "//".
    expect(isValidReturnTo('/%252F%252Fevil.com')).toBe(false);
  });

  test('rejects triple-encoded traversal', () => {
    expect(isValidReturnTo('/%25252F%25252Fevil.com')).toBe(false);
  });

  // ─── Malformed encoding ──────────────────────────────────────────────────

  test('rejects malformed percent-encoding that throws on decode', () => {
    // Lone `%` that is not followed by two hex digits → decodeURIComponent
    // throws URIError. Our validator should swallow it and reject.
    expect(isValidReturnTo('/%')).toBe(false);
    expect(isValidReturnTo('/%ZZ')).toBe(false);
  });
});
