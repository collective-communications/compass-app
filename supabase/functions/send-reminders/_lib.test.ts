import { describe, test, expect } from 'bun:test';
import { escapeHtml, renderTemplate, sanitizeUrl, daysBetween, shouldSkipReminder } from './_lib';

describe('escapeHtml', () => {
  test('escapes ampersand', () => {
    expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
  });

  test('escapes script tags', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
  });

  test('escapes quotes', () => {
    expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;');
    expect(escapeHtml("it's")).toBe('it&#39;s');
  });

  test('escapes all special chars combined', () => {
    expect(escapeHtml('<a href="x">&\'</a>')).toBe(
      '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;',
    );
  });

  test('clean string passes through unchanged', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
  });
});

describe('renderTemplate', () => {
  test('replaces single variable', () => {
    expect(renderTemplate('Hello {{name}}!', { name: 'Alice' })).toBe('Hello Alice!');
  });

  test('replaces multiple variables', () => {
    const result = renderTemplate('{{greeting}} {{name}}!', {
      greeting: 'Hi',
      name: 'Bob',
    });
    expect(result).toBe('Hi Bob!');
  });

  test('leaves missing variables as-is', () => {
    expect(renderTemplate('Hello {{unknown}}!', {})).toBe('Hello {{unknown}}!');
  });
});

describe('daysBetween', () => {
  test('exactly 24h returns 1', () => {
    const from = '2025-01-01T00:00:00Z';
    const to = new Date('2025-01-02T00:00:00Z');
    expect(daysBetween(from, to)).toBe(1);
  });

  test('23h returns 0 (Math.floor)', () => {
    const from = '2025-01-01T00:00:00Z';
    const to = new Date('2025-01-01T23:00:00Z');
    expect(daysBetween(from, to)).toBe(0);
  });
});

describe('sanitizeUrl', () => {
  test('accepts an https URL', () => {
    expect(sanitizeUrl('https://app.example.com/s/abc')).toBe('https://app.example.com/s/abc');
  });

  test('rejects http:// by default — falls back', () => {
    expect(
      sanitizeUrl('http://app.example.com/s/abc', { fallback: 'https://safe.example.com' }),
    ).toBe('https://safe.example.com');
  });

  test('accepts http:// when allowInsecure is true (dev mode)', () => {
    expect(sanitizeUrl('http://localhost:42333/s/abc', { allowInsecure: true })).toBe(
      'http://localhost:42333/s/abc',
    );
  });

  test('rejects javascript: pseudo-scheme', () => {
    expect(
      sanitizeUrl('javascript:alert(1)', { fallback: 'https://safe.example.com' }),
    ).toBe('https://safe.example.com');
  });

  test('rejects javascript: with leading whitespace and mixed case', () => {
    expect(
      sanitizeUrl('\t JavaScript:alert(1)', { fallback: 'https://safe.example.com' }),
    ).toBe('https://safe.example.com');
  });

  test('rejects data: scheme', () => {
    expect(
      sanitizeUrl('data:text/html,<script>', { fallback: 'https://safe.example.com' }),
    ).toBe('https://safe.example.com');
  });

  test('rejects vbscript: scheme', () => {
    expect(
      sanitizeUrl('vbscript:msgbox(1)', { fallback: 'https://safe.example.com' }),
    ).toBe('https://safe.example.com');
  });

  test('rejects protocol-relative URL', () => {
    expect(sanitizeUrl('//evil.com/x', { fallback: 'https://safe.example.com' })).toBe(
      'https://safe.example.com',
    );
  });

  test('HTML-escapes the URL so it cannot break out of href', () => {
    // A " in the URL would otherwise close the attribute and inject attrs.
    expect(sanitizeUrl('https://example.com/"onerror=alert(1)')).toBe(
      'https://example.com/&quot;onerror=alert(1)',
    );
  });

  test('empty string falls back', () => {
    expect(sanitizeUrl('', { fallback: 'https://safe.example.com' })).toBe('https://safe.example.com');
  });
});

describe('shouldSkipReminder', () => {
  test('null lastSentAt returns false', () => {
    expect(shouldSkipReminder(null, new Date())).toBe(false);
  });

  test('24h ago returns false (outside 23h window)', () => {
    const now = new Date('2025-06-02T12:00:00Z');
    const lastSent = '2025-06-01T12:00:00Z';
    expect(shouldSkipReminder(lastSent, now)).toBe(false);
  });

  test('22h ago returns true (within 23h window)', () => {
    const now = new Date('2025-06-02T12:00:00Z');
    const lastSent = '2025-06-01T14:00:00Z';
    expect(shouldSkipReminder(lastSent, now)).toBe(true);
  });
});
