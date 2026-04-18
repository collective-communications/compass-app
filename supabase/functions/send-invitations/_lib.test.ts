/**
 * Unit tests for the pure template-rendering and URL-sanitization helpers
 * used by the send-invitations edge function.
 */

import { describe, test, expect } from 'bun:test';
import { escapeHtml, renderTemplate, sanitizeUrl } from './_lib';

describe('escapeHtml', () => {
  test('escapes ampersand', () => {
    expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
  });

  test('escapes script tags', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
  });

  test('escapes all special chars combined', () => {
    expect(escapeHtml('<a href="x">&\'</a>')).toBe(
      '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;',
    );
  });
});

describe('renderTemplate', () => {
  test('replaces variables', () => {
    expect(renderTemplate('Hi {{name}}', { name: 'Ada' })).toBe('Hi Ada');
  });

  test('leaves unknown variables untouched', () => {
    expect(renderTemplate('Hi {{unknown}}', {})).toBe('Hi {{unknown}}');
  });
});

describe('sanitizeUrl', () => {
  test('accepts an https URL', () => {
    expect(sanitizeUrl('https://app.example.com/s/abc')).toBe('https://app.example.com/s/abc');
  });

  test('rejects http:// by default — falls back to provided safe URL', () => {
    expect(
      sanitizeUrl('http://app.example.com/s/abc', { fallback: 'https://safe.example.com' }),
    ).toBe('https://safe.example.com');
  });

  test('accepts http:// when allowInsecure is true', () => {
    expect(sanitizeUrl('http://localhost:42333/s/abc', { allowInsecure: true })).toBe(
      'http://localhost:42333/s/abc',
    );
  });

  test('rejects javascript: pseudo-scheme', () => {
    expect(
      sanitizeUrl('javascript:alert(1)', { fallback: 'https://safe.example.com' }),
    ).toBe('https://safe.example.com');
  });

  test('rejects mixed-case javascript: with leading whitespace', () => {
    expect(
      sanitizeUrl(' \tJavaScript:alert(1)', { fallback: 'https://safe.example.com' }),
    ).toBe('https://safe.example.com');
  });

  test('rejects data: URL', () => {
    expect(
      sanitizeUrl('data:text/html,<script>alert(1)</script>', { fallback: 'https://safe.example.com' }),
    ).toBe('https://safe.example.com');
  });

  test('rejects vbscript: URL', () => {
    expect(sanitizeUrl('vbscript:msgbox(1)', { fallback: 'https://safe.example.com' })).toBe(
      'https://safe.example.com',
    );
  });

  test('rejects file: URL', () => {
    expect(sanitizeUrl('file:///etc/passwd', { fallback: 'https://safe.example.com' })).toBe(
      'https://safe.example.com',
    );
  });

  test('rejects protocol-relative //host', () => {
    expect(sanitizeUrl('//evil.com/x', { fallback: 'https://safe.example.com' })).toBe(
      'https://safe.example.com',
    );
  });

  test('rejects scheme-less path', () => {
    expect(sanitizeUrl('/s/abc', { fallback: 'https://safe.example.com' })).toBe(
      'https://safe.example.com',
    );
  });

  test('HTML-escapes a quote in the URL so attribute breakout is impossible', () => {
    // A " in the URL would otherwise close the href attribute and inject attrs.
    expect(sanitizeUrl('https://example.com/"onerror=alert(1)')).toBe(
      'https://example.com/&quot;onerror=alert(1)',
    );
  });

  test('empty input falls back', () => {
    expect(sanitizeUrl('', { fallback: 'https://safe.example.com' })).toBe(
      'https://safe.example.com',
    );
  });

  test('empty input with no fallback returns empty string', () => {
    expect(sanitizeUrl('')).toBe('');
  });
});
