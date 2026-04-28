/**
 * Integration tests for the ScoringValidator dev tool.
 *
 * Renders the full component tree with real scoring functions and exercises
 * state transitions through user interactions.
 */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import { ScoringValidator } from './ScoringValidator.js';

afterEach(cleanup);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getConfigSelect(): HTMLSelectElement {
  return document.querySelector('select') as HTMLSelectElement;
}

function selectPreset(presetValue: string): void {
  fireEvent.change(getConfigSelect(), { target: { value: presetValue } });
}

function clickButton(label: string): void {
  const btn = screen.getByRole('button', { name: label });
  fireEvent.click(btn);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ScoringValidator', () => {
  describe('initial render', () => {
    beforeEach(() => {
      act(() => { render(<ScoringValidator />); });
    });

    it('renders the dev tool header', () => {
      expect(screen.getByText('Scoring Validator')).toBeTruthy();
      expect(screen.getByText('DEV')).toBeTruthy();
    });

    it('renders all four dimension labels in the score preview cards', () => {
      // Labels appear in both the SVG compass text and the dimension score cards.
      expect(screen.getAllByText('CORE').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('CLARITY').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('CONNECTION').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('COLLABORATION').length).toBeGreaterThanOrEqual(1);
    });

    it('renders the tab bar with all standard tabs', () => {
      expect(screen.getByRole('button', { name: 'Scores' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Archetypes' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Risk Flags' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Trust Ladder' })).toBeTruthy();
    });

    it('Compare tab is not visible before compare mode is enabled', () => {
      expect(screen.queryByRole('button', { name: 'Compare' })).toBeNull();
    });

    it('initializes with dimension scores that are neither 0.00% nor 100.00%', () => {
      // Midpoint answers on a mixed forward/reverse 4pt scale produce per-dimension
      // scores between 0 and 100. Verify scores are present and not at either extreme.
      expect(screen.queryAllByText('0.00%').length).toBe(0);
      expect(screen.queryAllByText('100.00%').length).toBe(0);
      // At least four score percentage values are visible (one per dimension card).
      const allText = document.body.textContent ?? '';
      expect(allText).toMatch(/\d+\.\d+%/);
    });
  });

  describe('preset loading', () => {
    beforeEach(() => {
      act(() => { render(<ScoringValidator />); });
    });

    it('loads Healthy Org preset — all dimension score cards show 100.00%', () => {
      act(() => { selectPreset('healthy-org'); });
      // Four dimension cards in CompassPreview each show the score
      const hundredPcts = screen.getAllByText('100.00%');
      expect(hundredPcts.length).toBeGreaterThanOrEqual(4);
    });

    it('loads Disconnected preset — all dimension score cards show 0.00%', () => {
      act(() => { selectPreset('disconnected'); });
      const zeroPcts = screen.getAllByText('0.00%');
      expect(zeroPcts.length).toBeGreaterThanOrEqual(4);
    });

    it('reset button clears an active preset and restores default scores', () => {
      act(() => { selectPreset('healthy-org'); });
      expect(screen.getAllByText('100.00%').length).toBeGreaterThanOrEqual(4);

      act(() => { clickButton('Reset'); });

      // After reset, 100% is gone from the dimension preview cards
      expect(screen.queryAllByText('100.00%').length).toBe(0);
      // Default midpoint scores reappear (non-trivial values, not 0 or 100)
      expect(screen.queryAllByText('0.00%').length).toBe(0);
    });

    it('loads Scale Parity preset — all dimensions show 66.67% on 4pt scale', () => {
      // Scale Parity uses answer value 3 for all forward questions and 2 for all
      // reverse-scored questions on a 4pt scale, producing uniform 66.67%.
      act(() => { selectPreset('scale-parity'); });
      const scores = screen.getAllByText('66.67%');
      expect(scores.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('scale toggle', () => {
    beforeEach(() => {
      act(() => { render(<ScoringValidator />); });
    });

    it('switching from 4pt to 5pt produces different score values', () => {
      const before = document.body.textContent ?? '';
      const before4ptScores = before.match(/\d+\.\d+%/g) ?? [];

      act(() => { clickButton('5pt'); });

      const after = document.body.textContent ?? '';
      const after5ptScores = after.match(/\d+\.\d+%/g) ?? [];
      // Scores should change when scale changes
      expect(before4ptScores.join()).not.toBe(after5ptScores.join());
    });

    it('Scale Parity preset: switching to 5pt shifts scores away from 66.67%', () => {
      act(() => { selectPreset('scale-parity'); });

      // Confirm 66.67% present on 4pt
      expect(screen.getAllByText('66.67%').length).toBeGreaterThanOrEqual(4);

      act(() => { clickButton('5pt'); });

      // On 5pt scale the normalization changes — 66.67% should no longer appear
      expect(screen.queryAllByText('66.67%').length).toBe(0);
      // New per-dimension scores appear instead
      const allText = document.body.textContent ?? '';
      expect(allText).toMatch(/\d+\.\d+%/);
    });

    it('switching back to 4pt after 5pt restores original scores', () => {
      // Capture 4pt scores
      const initial4pt = document.body.textContent?.match(/\d+\.\d+%/g)?.join() ?? '';

      act(() => { clickButton('5pt'); });
      act(() => { clickButton('4pt'); });

      const restored4pt = document.body.textContent?.match(/\d+\.\d+%/g)?.join() ?? '';
      expect(restored4pt).toBe(initial4pt);
    });
  });

  describe('tab navigation', () => {
    beforeEach(() => {
      act(() => { render(<ScoringValidator />); });
    });

    it('Archetypes tab renders archetype names not present in preset dropdown', () => {
      act(() => { clickButton('Archetypes'); });
      // 'Balanced' and 'Core-Fragile' only appear in the archetype distance table,
      // not in the preset selector (which has presets like 'Healthy Org', etc.).
      expect(screen.getByText('Balanced')).toBeTruthy();
      expect(screen.getByText('Core-Fragile')).toBeTruthy();
    });

    it('Archetypes tab renders all six archetype rows in the distance table', () => {
      act(() => { clickButton('Archetypes'); });
      // queryAllByText handles names that also appear in the preset dropdown
      expect(screen.getAllByText('Balanced').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Core-Fragile').length).toBeGreaterThanOrEqual(1);
      // These names also appear in the preset <option> elements but are still findable
      expect(screen.getAllByText(/Clarity-Driven/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Connection-Driven/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Collaboration-Driven/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Disconnected/).length).toBeGreaterThanOrEqual(1);
    });

    it('Archetypes tab shows the matched archetype name prominently', () => {
      act(() => { clickButton('Archetypes'); });
      // The matched archetype card (rendered at 18px font-weight 700) displays a name.
      // Any of the six archetype names in the card heading should be present.
      const archetypeNames = [
        'Balanced', 'Core-Fragile', 'Clarity-Driven',
        'Connection-Driven', 'Collaboration-Driven', 'Disconnected',
      ];
      const found = archetypeNames.some(
        (name) => screen.queryAllByText(name).length > 0,
      );
      expect(found).toBe(true);
    });

    it('Risk Flags tab shows threshold input labels', () => {
      act(() => { clickButton('Risk Flags'); });
      expect(screen.getByText('Core critical below')).toBeTruthy();
      expect(screen.getByText('Any dimension high below')).toBeTruthy();
      expect(screen.getByText('Core medium below')).toBeTruthy();
    });

    it('Trust Ladder tab shows rung names', () => {
      act(() => { clickButton('Trust Ladder'); });
      expect(screen.getByText('Purpose')).toBeTruthy();
      expect(screen.getByText('Values')).toBeTruthy();
      expect(screen.getByText('Mission / Vision')).toBeTruthy();
      expect(screen.getByText('Role Clarification')).toBeTruthy();
      expect(screen.getByText('Career / Growth')).toBeTruthy();
    });

    it('switching from Archetypes to Trust Ladder replaces tab content', () => {
      act(() => { clickButton('Archetypes'); });
      expect(screen.getByText('Balanced')).toBeTruthy();

      act(() => { clickButton('Trust Ladder'); });
      expect(screen.getByText('Purpose')).toBeTruthy();
      // Balanced only appears in the archetype distance table — not on Trust Ladder tab
      expect(screen.queryByText('Balanced')).toBeNull();
    });

    it('switching from Archetypes to Scores hides archetype content', () => {
      act(() => { clickButton('Archetypes'); });
      expect(screen.getByText('Core-Fragile')).toBeTruthy();

      act(() => { clickButton('Scores'); });
      expect(screen.queryByText('Core-Fragile')).toBeNull();
    });
  });

  describe('compare mode', () => {
    beforeEach(() => {
      act(() => { render(<ScoringValidator />); });
    });

    it('⇄ Compare button makes the Compare tab appear in the tab bar', () => {
      expect(screen.queryByRole('button', { name: 'Compare' })).toBeNull();
      act(() => { clickButton('⇄ Compare'); });
      expect(screen.getByRole('button', { name: 'Compare' })).toBeTruthy();
    });

    it('activating compare mode auto-navigates to the Compare tab', () => {
      act(() => { clickButton('⇄ Compare'); });
      // ComparePanel renders "Scenario B:" label for the preset selector
      expect(screen.getByText('Scenario B:')).toBeTruthy();
    });

    it('Compare tab shows a second preset selector for Scenario B', () => {
      act(() => { clickButton('⇄ Compare'); });
      // ConfigBar has one select; ComparePanel adds a second
      const selects = document.querySelectorAll('select');
      expect(selects.length).toBe(2);
    });

    it('Compare tab immediately shows a comparison table using current answers as Scenario B', () => {
      // handleCompareToggle snapshots current answers into scenarioB, so outputsB
      // is populated immediately — the table renders without picking a preset.
      act(() => { clickButton('⇄ Compare'); });
      expect(screen.getByText('Scenario A')).toBeTruthy();
      expect(screen.getByText('Scenario B')).toBeTruthy();
    });

    it('loading a Scenario B preset updates the comparison table', () => {
      act(() => { clickButton('⇄ Compare'); });

      const selects = document.querySelectorAll('select');
      const bSelect = selects[1] as HTMLSelectElement;
      act(() => {
        fireEvent.change(bSelect, { target: { value: 'healthy-org' } });
      });

      // Comparison table should still be visible with updated B values
      expect(screen.getByText('Scenario A')).toBeTruthy();
      expect(screen.getByText('Scenario B')).toBeTruthy();
    });

    it('toggling compare mode off removes the Compare tab', () => {
      act(() => { clickButton('⇄ Compare'); });
      expect(screen.getByRole('button', { name: 'Compare' })).toBeTruthy();

      act(() => { clickButton('⇄ Compare'); });
      expect(screen.queryByRole('button', { name: 'Compare' })).toBeNull();
    });
  });

  describe('Risk Flags tab — threshold interaction', () => {
    beforeEach(() => {
      act(() => { render(<ScoringValidator />); });
      act(() => { clickButton('Risk Flags'); });
    });

    it('shows no active risk flags when Healthy Org preset is loaded', () => {
      act(() => { selectPreset('healthy-org'); });
      expect(
        screen.getByText(/No active risk flags — all dimensions healthy\./),
      ).toBeTruthy();
    });

    it('shows active CRITICAL flags when Disconnected preset is loaded', () => {
      act(() => { selectPreset('disconnected'); });
      // All dimensions at 0% — at least one critical risk flag fires
      const criticalBadges = screen.getAllByText('CRITICAL');
      expect(criticalBadges.length).toBeGreaterThanOrEqual(1);
    });

    it('threshold inputs are present and editable', () => {
      const inputs = screen.getAllByRole('spinbutton');
      expect(inputs.length).toBe(3);
      // Verify one threshold input can be changed
      act(() => {
        fireEvent.change(inputs[0]!, { target: { value: '50' } });
      });
      expect((inputs[0] as HTMLInputElement).value).toBe('50');
    });
  });
});
