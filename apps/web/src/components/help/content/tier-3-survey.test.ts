import { describe, test, expect } from 'bun:test';

/**
 * Tests for the Tier 3 survey help factory.
 *
 * Wave 1.7 parameterised the keyboard-shortcut string on `scaleSize` so the
 * help drawer reflects the active survey's Likert scale. These tests pin:
 *   - `buildSurveyHelp(N)` produces a shortcut ending in `1-N`.
 *   - `registerTier3Content()` (no arg) falls back to the canonical default (5).
 */

import { buildSurveyHelp, registerTier3Content } from './tier-3-survey';
import { getHelpContent } from '../help-content-store';

describe('buildSurveyHelp', () => {
  test('scaleSize=5 — keyboard shortcut is "1-5: Select answer option"', () => {
    const entry = buildSurveyHelp(5);
    const shortcuts = entry.sections[1]?.keyboardShortcuts ?? [];
    expect(shortcuts[0]).toBe('1-5: Select answer option');
  });

  test('scaleSize=4 — keyboard shortcut ends in "1-4"', () => {
    const entry = buildSurveyHelp(4);
    const shortcuts = entry.sections[1]?.keyboardShortcuts ?? [];
    expect(shortcuts[0]).toBe('1-4: Select answer option');
    expect(shortcuts[0]).toMatch(/^1-4:/);
  });

  test('scaleSize=7 — keyboard shortcut ends in "1-7"', () => {
    const entry = buildSurveyHelp(7);
    const shortcuts = entry.sections[1]?.keyboardShortcuts ?? [];
    expect(shortcuts[0]).toBe('1-7: Select answer option');
  });

  test('title and anonymity copy are scale-independent', () => {
    const a = buildSurveyHelp(4);
    const b = buildSurveyHelp(5);
    expect(a.title).toBe(b.title);
    expect(a.sections[0]?.content).toBe(b.sections[0]?.content);
  });

  test('every section has a non-empty heading and content', () => {
    const entry = buildSurveyHelp(5);
    for (const section of entry.sections) {
      expect(section.heading.length).toBeGreaterThan(0);
      expect(section.content.length).toBeGreaterThan(0);
    }
  });
});

describe('registerTier3Content', () => {
  test('no-arg call falls back to 5 and registers under /s and /survey', () => {
    registerTier3Content();
    const sEntry = getHelpContent('/s');
    const surveyEntry = getHelpContent('/survey');

    expect(sEntry).not.toBeNull();
    expect(surveyEntry).not.toBeNull();

    const shortcut = sEntry!.sections[1]?.keyboardShortcuts?.[0] ?? '';
    expect(shortcut).toBe('1-5: Select answer option');

    // Both prefixes resolve to structurally equal content.
    expect(surveyEntry!.sections[1]?.keyboardShortcuts?.[0]).toBe(shortcut);
  });

  test('explicit scaleSize overrides the default', () => {
    registerTier3Content(4);
    const entry = getHelpContent('/s');
    expect(entry).not.toBeNull();
    expect(entry!.sections[1]?.keyboardShortcuts?.[0]).toBe('1-4: Select answer option');

    // Reset to the default so subsequent tests (or test runs) aren't polluted
    // by lingering Likert-4 help content in the module-scoped registry.
    registerTier3Content(5);
  });
});
